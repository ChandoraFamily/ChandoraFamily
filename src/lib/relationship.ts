import type { Person } from "@/types/person";

function ancestorDepths(
  persons: Person[],
  startId: string,
): Map<string, number> {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const depths = new Map<string, number>();
  const queue: [string, number][] = [[startId, 0]];
  while (queue.length) {
    const [id, depth] = queue.shift()!;
    if (depths.has(id) && depths.get(id)! <= depth) continue;
    depths.set(id, depth);
    const person = byId.get(id);
    if (!person) continue;
    for (const parentId of person.parentIds) queue.push([parentId, depth + 1]);
  }
  return depths;
}

function grandTerm(
  base: "grandparent" | "grandfather" | "grandmother",
  extra: number,
) {
  return "great-".repeat(Math.max(0, extra)) + base;
}

/**
 * Describes how personA relates to personB.
 *
 * NOTE on scope: two people at the same tree-depth are always described as
 * siblings here, even if their nearest shared ancestor is a grandparent
 * (i.e. technically cousins). If you'd like cousin-degree language
 * ("1st cousin", "2nd cousin once removed", etc.) for same/different-depth
 * cases where the common ancestor is more than one generation up, say so
 * and I'll extend this.
 */
export function describeRelationship(
  persons: Person[],
  idA: string,
  idB: string,
): string {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const personA = byId.get(idA);
  const personB = byId.get(idB);
  if (!personA || !personB) return "One or both persons were not found.";
  if (idA === idB) return `${personA.firstName} is the same person.`;

  const nameA = `${personA.firstName} ${personA.lastName}`;
  const nameB = `${personB.firstName} ${personB.lastName}`;

  const depthsA = ancestorDepths(persons, idA);
  const depthsB = ancestorDepths(persons, idB);

  let best: { depthA: number; depthB: number } | null = null;
  for (const [ancestorId, depthA] of depthsA.entries()) {
    const depthB = depthsB.get(ancestorId);
    if (depthB === undefined) continue;
    if (!best || depthA + depthB < best.depthA + best.depthB) {
      best = { depthA, depthB };
    }
  }

  if (!best) {
    if (personA.spouseIds.includes(idB))
      return `${nameA} is married to ${nameB}.`;
    return `No known blood relationship found between ${nameA} and ${nameB}.`;
  }

  const { depthA, depthB } = best;

  // One is a direct ancestor of the other.
  if (depthA === 0 || depthB === 0) {
    const diff = Math.max(depthA, depthB);
    const higherIsA = depthA === 0;
    const higherName = higherIsA ? nameA : nameB;
    const lowerName = higherIsA ? nameB : nameA;
    const higherPerson = higherIsA ? personA : personB;
    if (diff === 1) return `${higherName} is the parent of ${lowerName}.`;
    const base =
      higherPerson.gender === "male"
        ? "grandfather"
        : higherPerson.gender === "female"
          ? "grandmother"
          : "grandparent";
    return `${higherName} is the ${grandTerm(base as any, diff - 2)} of ${lowerName}.`;
  }

  if (depthA === depthB) {
    const term =
      personA.gender === "male"
        ? "brother"
        : personA.gender === "female"
          ? "sister"
          : "sibling";
    return `${nameA} is the ${term} of ${nameB}.`;
  }

  const diff = Math.abs(depthA - depthB);
  const higherIsA = depthA < depthB;
  const higherName = higherIsA ? nameA : nameB;
  const lowerName = higherIsA ? nameB : nameA;
  const higherPerson = higherIsA ? personA : personB;

  if (diff === 1) {
    const term =
      higherPerson.gender === "male"
        ? "Chacha"
        : higherPerson.gender === "female"
          ? "Bua"
          : "uncle/aunt";
    return `${higherName} is the ${term} of ${lowerName}.`;
  }

  const base =
    higherPerson.gender === "male"
      ? "grandfather"
      : higherPerson.gender === "female"
        ? "grandmother"
        : "grandparent";
  return `${higherName} is the ${grandTerm(base as any, diff - 2)} of ${lowerName}.`;
}
