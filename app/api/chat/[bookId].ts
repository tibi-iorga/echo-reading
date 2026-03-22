import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth.js";
import { db } from "../_lib/db.js";
import { chatMessages } from "../_lib/schema.js";
import { parseBookId, parseBody, ChatMessagesSchema } from "../_lib/validate.js";
import { eq, and, asc } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);
    const bookId = parseBookId(req, res);
    if (!bookId) return;

    if (req.method === "GET") {
      const rows = await db
        .select()
        .from(chatMessages)
        .where(and(eq(chatMessages.bookId, bookId), eq(chatMessages.clerkUserId, userId)))
        .orderBy(asc(chatMessages.createdAt));

      const result = rows.map((row) => ({
        id: row.id,
        role: row.role,
        content: row.content,
        quotedText: row.quotedText,
      }));

      return res.status(200).json(result);
    }

    // PUT — full replace all messages
    if (req.method === "PUT") {
      const data = parseBody(ChatMessagesSchema, req.body, res);
      if (!data) return;
      const { messages } = data;

      await db
        .delete(chatMessages)
        .where(and(eq(chatMessages.bookId, bookId), eq(chatMessages.clerkUserId, userId)));

      if (messages && messages.length > 0) {
        const rows = messages.map((m: { id: string; role: string; content: string; quotedText?: string | null }) => ({
          id: m.id,
          bookId,
          clerkUserId: userId,
          role: m.role,
          content: m.content,
          quotedText: m.quotedText ?? null,
        }));

        await db.insert(chatMessages).values(rows);
      }

      return res.status(200).json({ ok: true });
    }

    // POST — append messages (incremental)
    if (req.method === "POST") {
      const data = parseBody(ChatMessagesSchema, req.body, res);
      if (!data) return;
      const { messages } = data;

      if (messages && messages.length > 0) {
        const rows = messages.map((m: { id: string; role: string; content: string; quotedText?: string | null }) => ({
          id: m.id,
          bookId,
          clerkUserId: userId,
          role: m.role,
          content: m.content,
          quotedText: m.quotedText ?? null,
        }));

        await db.insert(chatMessages).values(rows);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
