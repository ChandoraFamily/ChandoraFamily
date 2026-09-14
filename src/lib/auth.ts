import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";

const JWT_SECRET =
  process.env.JWT_SECRET || "chandora-lineage-jwt-secret-default-key-2026";
const COOKIE_NAME = "lineage_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "editor";
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) =>
  bcrypt.compare(pw, hash);

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function setSessionCookie(token: string) {
  try {
    cookies().set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch (err) {
    console.warn("[auth] Failed to set cookie:", err);
  }
}

export function clearSessionCookie() {
  try {
    cookies().delete(COOKIE_NAME);
  } catch {}
}

export function getSession(req?: Request): SessionPayload | null {
  let token: string | undefined;

  // 1. Check Authorization header first (most reliable inside iframes)
  try {
    const authHeader =
      req?.headers.get("authorization") || headers().get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  } catch {}

  // 2. Check direct cookie header from req if available
  if (!token && req) {
    try {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(
          new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
        );
        if (match) token = decodeURIComponent(match[1]);
      }
    } catch {}
  }

  // 3. Fallback to cookies() from next/headers
  if (!token) {
    try {
      token = cookies().get(COOKIE_NAME)?.value;
    } catch {}
  }

  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}
