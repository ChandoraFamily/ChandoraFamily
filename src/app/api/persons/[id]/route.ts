import { NextRequest, NextResponse } from "next/server";
import { getPerson, updatePerson, deletePerson, getConnectedRelatives } from "@/lib/db";
import type { PersonInput } from "@/types/person";

interface Params {
  params: { id: string };
}

// GET /api/persons/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const person = await getPerson(params.id);
  if (!person) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  const connected = await getConnectedRelatives(params.id);
  return NextResponse.json({ data: person, connected });
}

// PUT /api/persons/:id -> partial update
export async function PUT(req: NextRequest, { params }: Params) {
  let body: Partial<PersonInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const updated = await updatePerson(params.id, body);
  if (!updated) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  return NextResponse.json({ data: updated });
}

// DELETE /api/persons/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const removed = await deletePerson(params.id);
  if (!removed) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  return NextResponse.json({ data: { id: params.id } });
}
