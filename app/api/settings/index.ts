import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth.js";
import { db } from "../_lib/db.js";
import { userSettings } from "../_lib/schema.js";
import { parseBody, SettingsSchema } from "../_lib/validate.js";
import { eq } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);

    if (req.method === "GET") {
      const result = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.clerkUserId, userId))
        .limit(1);

      if (result.length === 0) return res.status(200).json(null);

      const row = result[0];
      return res.status(200).json({
        activeTab: row.activeTab,
        isPanelCollapsed: row.isPanelCollapsed,
        sidebarWidth: row.sidebarWidth,
        theme: row.theme,
        chatInstructions: row.chatInstructions,
        llmProvider: row.llmProvider,
        llmModel: row.llmModel,
      });
    }

    if (req.method === "PUT") {
      const settings = parseBody(SettingsSchema, req.body, res);
      if (!settings) return;

      const insertValues = {
        clerkUserId: userId,
        activeTab: settings.active_tab as string | undefined,
        isPanelCollapsed: settings.is_panel_collapsed as boolean | undefined,
        sidebarWidth: settings.sidebar_width as number | undefined,
        theme: settings.theme as string | undefined,
        chatInstructions: settings.chat_instructions as string | undefined,
        llmProvider: settings.llm_provider as string | undefined,
        llmModel: settings.llm_model as string | undefined,
      };

      const { clerkUserId: _, ...updateFields } = insertValues;

      await db
        .insert(userSettings)
        .values(insertValues)
        .onConflictDoUpdate({
          target: userSettings.clerkUserId,
          set: { ...updateFields, updatedAt: new Date() },
        });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
