import { NextRequest, NextResponse } from "next/server";
import { listAllPersonsForTree, listPersons } from "@/lib/db";
import { buildFamilyTree } from "@/lib/tree";

interface Params {
  params: { id: string };
}

// GET /api/persons/:id/tree?up=2&down=1&expandedAncestors=...&expandedDescendants=...
// Returns a positioned graph (nodes + edges) centered on the given person,
// ready for the FamilyTree component to render.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const up = Number(req.nextUrl.searchParams.get("up") ?? 2);
    const down = Number(req.nextUrl.searchParams.get("down") ?? 1);
    const expandAncestors =
      req.nextUrl.searchParams.get("expandAncestors") === "true";

    const expandedAncestorsParam = req.nextUrl.searchParams.get("expandedAncestors");
    const expandedDescendantsParam = req.nextUrl.searchParams.get("expandedDescendants");

    const expandedAncestors = expandedAncestorsParam
      ? expandedAncestorsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const expandedDescendants = expandedDescendantsParam
      ? expandedDescendantsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const persons = await listAllPersonsForTree();
    const focus = persons.find((p) => p.id === params.id);
    if (!focus) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }

    const graph = buildFamilyTree(
      persons,
      params.id,
      up,
      down,
      expandAncestors,
      expandedAncestors,
      expandedDescendants,
    );
    return NextResponse.json({ data: graph });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/persons/:id/tree
// Body: { up, down, expandAncestors, expandedAncestors, expandedDescendants }
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json().catch(() => ({}));
    const up = Number(body.up ?? 2);
    const down = Number(body.down ?? 1);
    const expandAncestors = Boolean(body.expandAncestors);
    const expandedAncestors = Array.isArray(body.expandedAncestors)
      ? body.expandedAncestors
      : [];
    const expandedDescendants = Array.isArray(body.expandedDescendants)
      ? body.expandedDescendants
      : [];

    const persons = await listAllPersonsForTree();
    const focus = persons.find((p) => p.id === params.id);
    if (!focus) {
      return NextResponse.json({ error: "Person not found." }, { status: 404 });
    }

    const graph = buildFamilyTree(
      persons,
      params.id,
      up,
      down,
      expandAncestors,
      expandedAncestors,
      expandedDescendants,
    );
    return NextResponse.json({ data: graph });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
