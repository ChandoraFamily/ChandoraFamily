export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updatePerson } from "@/lib/db";
import { getModels } from "@/lib/models";

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { action } = await req.json();
  const { SuggestEdit } = getModels();
  const edit = await SuggestEdit.findById(params.id);
  if (!edit) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (action === "approve") {
    await updatePerson(edit.personId, edit.changes as any);
    edit.status = "approved";
  } else {
    edit.status = "rejected";
  }
  await edit.save();
  return NextResponse.json({ data: { ok: true } });
}
