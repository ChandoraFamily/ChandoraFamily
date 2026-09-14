export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getModelsAsync } from "@/lib/models";

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const filter = status && status !== "all" ? { status } : {};
    const { SuggestEdit } = await getModelsAsync();
    const docs = await SuggestEdit.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ data: docs || [] });
  } catch (err: any) {
    console.error("GET /api/suggested-edits error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load suggested edits." },
      { status: 500 },
    );
  }
}
