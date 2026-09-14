export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { updatePerson } from "@/lib/db";
import { getModelsAsync } from "@/lib/models";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const body = await req.json();
    const action = body?.action;
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'." },
        { status: 400 },
      );
    }

    const { SuggestEdit } = await getModelsAsync();
    const edit = await SuggestEdit.findById(id);
    if (!edit) {
      return NextResponse.json({ error: "Suggested edit not found." }, { status: 404 });
    }

    if (action === "approve") {
      if (edit.changes && typeof edit.changes === "object") {
        try {
          await updatePerson(edit.personId, edit.changes as any);
        } catch (updateErr: any) {
          console.error("Failed to update person from suggested edit:", updateErr);
          return NextResponse.json(
            { error: "Failed to apply changes to person: " + updateErr.message },
            { status: 500 },
          );
        }
      }
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    edit.status = newStatus;

    await SuggestEdit.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true },
    );

    if (typeof edit.save === "function") {
      try {
        await edit.save();
      } catch (saveErr: any) {
        console.warn("edit.save error:", saveErr.message);
      }
    }

    return NextResponse.json({ data: { ok: true, status: newStatus } });
  } catch (err: any) {
    console.error("PATCH /api/suggested-edits/[id] error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process edit." },
      { status: 500 },
    );
  }
}
