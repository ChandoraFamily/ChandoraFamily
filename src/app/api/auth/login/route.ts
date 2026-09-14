export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { getModelsAsync } from "@/lib/models";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 422 },
    );
  }

  const { User } = await getModelsAsync();
  console.log("USER MODEL:", {
    modelName: User.modelName,
    collection: User.collection.name,
    database: User.db.name,
  });
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  }
  const token = signSession({
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await setSessionCookie(token);
  return NextResponse.json({
    data: { email: user.email, name: user.name, role: user.role, token },
  });
}
