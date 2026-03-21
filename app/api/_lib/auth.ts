import { verifyToken } from "@clerk/backend";

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function authenticate(authHeader: string | undefined): Promise<string> {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    throw new AuthError(401, "Missing authorization token");
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return payload.sub;
  } catch {
    throw new AuthError(401, "Invalid token");
  }
}
