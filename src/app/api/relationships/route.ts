import { NextRequest, NextResponse } from "next/server";
import { addRelationship, removeRelationship } from "@/lib/db";
import type { RelationshipRequest } from "@/types/person";

function validate(body: any): body is RelationshipRequest {
  return (
    body &&
    (body.type === "parent-child" || body.type === "spouse") &&
    typeof body.personId === "string" &&
    typeof body.relatedId === "string"
  );
}

// POST /api/relationships
// body: { type: "parent-child" | "spouse", personId, relatedId }
// parent-child: personId is the PARENT, relatedId is the CHILD.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!validate(body)) {
    return NextResponse.json(
      { error: "type, personId, and relatedId are required." },
      { status: 422 },
    );
  }
  const result = await addRelationship(
    body.type,
    body.personId,
    body.relatedId,
    body.replaceParentId
      ? { replaceParentId: body.replaceParentId }
      : undefined,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ data: { ok: true } }, { status: 201 });
}

// DELETE /api/relationships
// body: { type: "parent-child" | "spouse", personId, relatedId }
export async function DELETE(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!validate(body)) {
    return NextResponse.json(
      { error: "type, personId, and relatedId are required." },
      { status: 422 },
    );
  }
  const result = await removeRelationship(
    body.type,
    body.personId,
    body.relatedId,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  return NextResponse.json({ data: { ok: true } });
}
