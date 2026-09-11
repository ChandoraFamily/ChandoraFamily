import { NextRequest, NextResponse } from "next/server";
import {
  listPersons,
  createPerson,
  searchPersons,
  listAllPersonsForTree,
} from "@/lib/db";
import type { PersonInput } from "@/types/person";
import { buildFamilyTree } from "@/lib/tree";

const MAX_LIMIT = 200;

// GET /api/persons            -> all persons
// GET /api/persons?q=smith    -> search by name/place
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q");
    const limit = Math.min(
      MAX_LIMIT,
      Number(req.nextUrl.searchParams.get("limit") ?? 50),
    );
    const skip = Number(req.nextUrl.searchParams.get("skip") ?? 0);

    const persons = q
      ? await searchPersons(q, { limit, skip })
      : await listPersons({ limit, skip });
    return NextResponse.json({ data: persons });
  } catch (err) {
    console.log("GET /api/persons failed:", err);
    return NextResponse.json(
      { error: "Failed to load persons." },
      { status: 500 },
    );
  }
}

// POST /api/persons -> create a person
export async function POST(req: NextRequest) {
  let body: PersonInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.firstName?.trim()) {
    return NextResponse.json(
      { error: "firstName are required." },
      { status: 422 },
    );
  }
  if (!body.gender) {
    return NextResponse.json({ error: "gender is required." }, { status: 422 });
  }

  const person = await createPerson(body);
  return NextResponse.json({ data: person }, { status: 201 });
}
