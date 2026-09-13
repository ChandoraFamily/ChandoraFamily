export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getModels } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 422 },
      );
    }
    const { ContactMessage } = getModels();
    await ContactMessage.create({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to submit message." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const { ContactMessage } = getModels();
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: messages });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch messages." },
      { status: 500 },
    );
  }
}
