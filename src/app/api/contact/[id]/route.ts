export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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

    const { status } = await req.json();
    if (status !== "new" && status !== "read") {
      return NextResponse.json(
        { error: "Status must be 'new' or 'read'." },
        { status: 400 },
      );
    }

    const { ContactMessage } = await getModelsAsync();
    const updated = await ContactMessage.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update message." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { ContactMessage } = await getModelsAsync();
    const deleted = await ContactMessage.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Message not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, id, data: { ok: true } });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete message." },
      { status: 500 },
    );
  }
}
