import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth.js";
import { r2, R2_BUCKET } from "../_lib/r2.js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const path = req.query.path as string;

    // Ensure the path belongs to this user
    if (!path.startsWith(`${userId}/`)) {
      console.error("Path ownership check failed:", { userId, pathPrefix: path.split("/")[0] });
      return res.status(403).json({ error: "Access denied", debug: { userId, pathPrefix: path.split("/")[0] } });
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: path,
    });

    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

    return res.status(200).json({ signedUrl });
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    console.error("API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
