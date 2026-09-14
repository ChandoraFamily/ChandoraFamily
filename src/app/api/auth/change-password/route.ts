export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getModels } from "@/lib/models";
import { getSession, verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return NextResponse.json(
      {
        error:
          "Current password and a new password (8+ characters) are required.",
      },
      { status: 422 },
    );
  }
  const { User } = getModels();
  const user = await User.findById(session.userId);
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok)
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 401 },
    );

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  return NextResponse.json({ data: { ok: true } });
}
