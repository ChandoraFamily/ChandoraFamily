export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { getModels } from "@/lib/models";

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) {
    return NextResponse.json(
      { error: "You must be logged in to create a user." },
      { status: 401 },
    );
  }
  const { email, password, name, role } = await req.json();
  if (!email?.trim() || !password || !name?.trim()) {
    return NextResponse.json(
      { error: "email, password, and name are required." },
      { status: 422 },
    );
  }
  const { User } = getModels();
  const existing = await User.findOne({
    email: email.toLowerCase().trim(),
  });
  if (existing) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 },
    );
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    name: name.trim(),
    role: role === "admin" ? "admin" : "editor",
    createdBy: session.userId,
  });
  return NextResponse.json(
    { data: { email: user.email, name: user.name, role: user.role } },
    { status: 201 },
  );
}
