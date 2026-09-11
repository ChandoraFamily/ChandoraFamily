import { NextRequest, NextResponse } from "next/server";
import { listAllPersonsForTree, listPersons } from "@/lib/db";
import { buildFamilyTree } from "@/lib/tree";

interface Params {
  params: { id: string };
}

// GET /api/persons/:id/tree?up=3&down=3
// Returns a positioned graph (nodes + edges) centered on the given person,
// ready for the FamilyTree component to render.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const up = Number(req.nextUrl.searchParams.get("up") ?? 5);
    const down = Number(req.nextUrl.searchParams.get("down") ?? 5);
    const expandAncestors =
      req.nextUrl.searchParams.get("expandAncestors") === "true";

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
    );
    return NextResponse.json({ data: graph });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
