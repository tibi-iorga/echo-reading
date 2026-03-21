import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth";
import { r2, R2_BUCKET } from "../_lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { path, contentType } = req.body;

    // Ensure the storage path starts with the user's ID (security)
    if (!path.startsWith(`${userId}/`)) {
      return res.status(403).json({ error: "Storage path must be under your user directory" });
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: path,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 600 });

    return res.status(200).json({ presignedUrl });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
