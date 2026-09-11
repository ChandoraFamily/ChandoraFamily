import { NextRequest, NextResponse } from "next/server";

// In-memory sliding-window limiter. This resets on every server restart and
// does NOT share state across multiple server instances/edge regions — fine
// for a single-server deployment (including the Electron/standalone case),
// but for a multi-instance production deploy you'll want a shared store
// (e.g. Upstash Redis) instead. Say the word if you get there.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const hits = new Map<string, { count: number; windowStart: number }>();

const BAD_BOT_PATTERNS = [
  /python-requests/i,
  /scrapy/i,
  /curl\/[\d.]+$/i,
  /wget/i,
  /^$/, // empty user-agent
];

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const ua = req.headers.get("user-agent") ?? "";

  if (BAD_BOT_PATTERNS.some((p) => p.test(ua))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
    if (entry.count > MAX_REQUESTS_PER_WINDOW) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
