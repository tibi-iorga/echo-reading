import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db.js";
import { sql } from "drizzle-orm";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);

    return res.status(200).json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
