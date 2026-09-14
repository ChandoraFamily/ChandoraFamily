export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getModelsAsync } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 422 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 422 },
      );
    }

    if (name.trim().length > 120) {
      return NextResponse.json(
        { error: "Name must be under 120 characters." },
        { status: 422 },
      );
    }

    if (message.trim().length > 5000) {
      return NextResponse.json(
        { error: "Message must be under 5,000 characters." },
        { status: 422 },
      );
    }

    const { ContactMessage } = await getModelsAsync();
    const created = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
      status: "new",
    });

    return NextResponse.json({ ok: true, id: created._id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/contact error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit message." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { ContactMessage } = await getModelsAsync();
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ data: messages });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch messages." },
      { status: 500 },
    );
  }
}
