import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth.js";
import { db } from "../_lib/db.js";
import { userSettings } from "../_lib/schema.js";
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
      const settings = req.body;

      const values: Record<string, unknown> = { clerkUserId: userId };
      if (settings.active_tab !== undefined) values.activeTab = settings.active_tab;
      if (settings.is_panel_collapsed !== undefined) values.isPanelCollapsed = settings.is_panel_collapsed;
      if (settings.sidebar_width !== undefined) values.sidebarWidth = settings.sidebar_width;
      if (settings.theme !== undefined) values.theme = settings.theme;
      if (settings.chat_instructions !== undefined) values.chatInstructions = settings.chat_instructions;
      if (settings.llm_provider !== undefined) values.llmProvider = settings.llm_provider;
      if (settings.llm_model !== undefined) values.llmModel = settings.llm_model;

      const updateValues = { ...values };
      delete updateValues.clerkUserId;
      updateValues.updatedAt = new Date();

      await db
        .insert(userSettings)
        .values(values)
        .onConflictDoUpdate({
          target: userSettings.clerkUserId,
          set: updateValues,
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
