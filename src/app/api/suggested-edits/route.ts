export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getModels } from "@/lib/models";

export async function GET() {
  const session = getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { SuggestEdit } = getModels();
  const docs = await SuggestEdit.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ data: docs });
}
