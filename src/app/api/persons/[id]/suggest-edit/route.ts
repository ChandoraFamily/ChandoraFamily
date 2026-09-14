export const runtime = "nodejs";
import { getModelsAsync } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const { submittedByName, submittedByEmail, note, changes } = await req.json();
  if (!changes || typeof changes !== "object") {
    return NextResponse.json(
      { error: "changes object is required." },
      { status: 422 },
    );
  }
  const { SuggestEdit } = await getModelsAsync();
  await SuggestEdit.create({
    personId: params.id,
    submittedByName,
    submittedByEmail,
    note,
    changes,
  });
  return NextResponse.json({ data: { ok: true } }, { status: 201 });
}
