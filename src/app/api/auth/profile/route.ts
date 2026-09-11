export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getModels } from "@/lib/models";
import { getSession, signSession, setSessionCookie } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { name, profilePicture } = await req.json();
  const { User } = getModels();
  const user = await User.findById(session.userId);
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (typeof name === "string" && name.trim()) user.name = name.trim();
  if (typeof profilePicture === "string") {
    if (profilePicture.length > 2_000_000) {
      return NextResponse.json(
        { error: "Image is too large." },
        { status: 413 },
      );
    }
    user.profilePicture = profilePicture;
  }
  await user.save();

  // Refresh the session cookie so the new name shows up immediately.
  const token = signSession({
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  });
  setSessionCookie(token);

  return NextResponse.json({
    data: {
      email: user.email,
      name: user.name,
      role: user.role,
      profilePicture: user.profilePicture,
    },
  });
}
