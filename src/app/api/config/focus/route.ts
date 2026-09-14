import { NextRequest, NextResponse } from "next/server";
import {
  getDefaultFocusId,
  setDefaultFocusId,
  getAdminPerson,
  getPerson,
  DEFAULT_ADMIN_PERSON_ID,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/config/focus -> returns configured default focus and admin person details
export async function GET() {
  try {
    const focusId = await getDefaultFocusId();
    const adminPerson = await getAdminPerson();
    const currentFocusPerson = await getPerson(focusId);

    return NextResponse.json({
      data: {
        focusId,
        adminPersonId: adminPerson?.id || DEFAULT_ADMIN_PERSON_ID,
        adminPerson,
        currentFocusPerson,
        isDefaultAdmin: focusId === (adminPerson?.id || DEFAULT_ADMIN_PERSON_ID),
      },
    });
  } catch (err) {
    console.error("GET /api/config/focus error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve focus configuration." },
      { status: 500 },
    );
  }
}

// POST /api/config/focus -> updates the default tree focus (restricted to admin or allows reset to admin)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized. Administrator permissions required to change default tree focus." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const targetFocusId = body.focusId;
    if (!targetFocusId || typeof targetFocusId !== "string") {
      return NextResponse.json(
        { error: "Invalid target focusId." },
        { status: 400 },
      );
    }

    const person = await getPerson(targetFocusId);
    if (!person) {
      return NextResponse.json(
        { error: "Target person not found." },
        { status: 404 },
      );
    }

    const ok = await setDefaultFocusId(targetFocusId);
    if (!ok) {
      return NextResponse.json(
        { error: "Failed to update default focus." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: {
        success: true,
        focusId: targetFocusId,
        person,
      },
    });
  } catch (err) {
    console.error("POST /api/config/focus error:", err);
    return NextResponse.json(
      { error: "Failed to update default focus configuration." },
      { status: 500 },
    );
  }
}
