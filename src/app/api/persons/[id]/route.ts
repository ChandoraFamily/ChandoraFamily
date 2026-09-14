import { NextRequest, NextResponse } from "next/server";
import { getPerson, updatePerson, deletePerson, getConnectedRelatives } from "@/lib/db";
import type { PersonInput } from "@/types/person";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/persons/:id
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const connected = await getConnectedRelatives(id);
  return NextResponse.json({ data: person, connected });
}

// PUT /api/persons/:id -> partial update
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  let body: Partial<PersonInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const updated = await updatePerson(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  return NextResponse.json({ data: updated });
}

// DELETE /api/persons/:id
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const removed = await deletePerson(id);
  if (!removed) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  return NextResponse.json({ data: { id } });
}
