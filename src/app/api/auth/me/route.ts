export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = getSession();
  return NextResponse.json({ data: session });
}
