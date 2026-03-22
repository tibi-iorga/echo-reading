import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth.js";
import { db } from "../_lib/db.js";
import { books } from "../_lib/schema.js";
import { parseBody, SignedUrlsSchema } from "../_lib/validate.js";
import { r2, R2_BUCKET } from "../_lib/r2.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq, inArray, and } from "drizzle-orm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const data = parseBody(SignedUrlsSchema, req.body, res);
    if (!data) return;
    const { paths } = data;

    if (paths.length === 0) {
      return res.status(200).json({ urls: {} });
    }

    // Verify which paths belong to this user via the database
    const ownedBooks = await db
      .select({ coverPath: books.coverPath })
      .from(books)
      .where(and(eq(books.clerkUserId, userId), inArray(books.coverPath, paths)));

    const ownedPaths = new Set(ownedBooks.map((b) => b.coverPath).filter(Boolean));

    const urls: Record<string, string> = {};

    await Promise.all(
      paths.map(async (path) => {
        if (!ownedPaths.has(path)) return;

        const command = new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: path,
        });

        const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
        urls[path] = signedUrl;
      })
    );

    return res.status(200).json({ urls });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
