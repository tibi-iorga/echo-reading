import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthError } from "../_lib/auth";
import { r2, R2_BUCKET } from "../_lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = await authenticate(req.headers.authorization);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { paths } = req.body as { paths: string[] };

    if (!paths || paths.length === 0) {
      return res.status(200).json({ urls: {} });
    }

    const urls: Record<string, string> = {};

    await Promise.all(
      paths.map(async (path) => {
        // Only sign paths belonging to this user
        if (!path.startsWith(`${userId}/`)) return;

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
