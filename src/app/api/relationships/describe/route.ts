import { NextRequest, NextResponse } from "next/server";
import { listAllPersonsForTree } from "@/lib/db";
import { describeRelationship } from "@/lib/relationship";

// GET /api/relationships/describe?a=<id>&b=<id>
export async function GET(req: NextRequest) {
  const idA = req.nextUrl.searchParams.get("a");
  const idB = req.nextUrl.searchParams.get("b");
  if (!idA || !idB) {
    return NextResponse.json(
      { error: 'Both "a" and "b" query params are required.' },
      { status: 422 },
    );
  }
  const persons = await listAllPersonsForTree();
  const description = describeRelationship(persons, idA, idB);
  return NextResponse.json({ data: { description } });
}
