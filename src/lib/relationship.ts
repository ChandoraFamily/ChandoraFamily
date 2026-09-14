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

export interface RelativeRelationInfo {
  relation: string;
  relationHi: string;
  type: "parent" | "spouse" | "child" | "sibling" | "ancestor" | "relative";
}

/**
 * Returns the relation title of `relative` with respect to `subject`.
 * E.g., if relative is subject's father, returns relation: "Father", relationHi: "पिता".
 */
export function getRelativeRelation(
  subject: Person,
  relative: Person,
  allPersons: Person[] = [],
): RelativeRelationInfo {
  const isFemale = relative.gender === "female";
  const isMale = relative.gender === "male";

  // 1. Is relative a direct parent of subject?
  if (subject.parentIds.includes(relative.id)) {
    return {
      relation: isFemale ? "Mother" : isMale ? "Father" : "Parent",
      relationHi: isFemale ? "माता" : isMale ? "पिता" : "माता-पिता",
      type: "parent",
    };
  }

  // 2. Is relative a spouse of subject?
  if (
    subject.spouseIds.includes(relative.id) ||
    relative.spouseIds.includes(subject.id)
  ) {
    return {
      relation: isFemale ? "Wife" : isMale ? "Husband" : "Spouse",
      relationHi: isFemale ? "पत्नी" : isMale ? "पति" : "जीवनसाथी",
      type: "spouse",
    };
  }

  // 3. Is relative a child of subject?
  if (relative.parentIds.includes(subject.id)) {
    return {
      relation: isFemale ? "Daughter" : isMale ? "Son" : "Child",
      relationHi: isFemale ? "पुत्री (बेटी)" : isMale ? "पुत्र (बेटा)" : "संतान",
      type: "child",
    };
  }

  // 4. Is relative a sibling of subject? (Shares at least one parent)
  if (
    subject.parentIds.length > 0 &&
    relative.parentIds.some((pid) => subject.parentIds.includes(pid))
  ) {
    return {
      relation: isFemale ? "Sister" : isMale ? "Brother" : "Sibling",
      relationHi: isFemale ? "बहन" : isMale ? "भाई" : "सहोदर",
      type: "sibling",
    };
  }

  // 5. Is relative a grandparent of subject?
  if (allPersons.length > 0 && subject.parentIds.length > 0) {
    const parent = allPersons.find(
      (p) =>
        subject.parentIds.includes(p.id) && p.parentIds.includes(relative.id),
    );
    if (parent) {
      const isPaternal = parent.gender === "male";
      if (isPaternal) {
        return {
          relation: isMale
            ? "Paternal Grandfather"
            : isFemale
            ? "Paternal Grandmother"
            : "Grandparent",
          relationHi: isMale
            ? "दादा (पिता के पिता)"
            : isFemale
            ? "दादी (पिता की माता)"
            : "दादा-दादी",
          type: "ancestor",
        };
      } else {
        return {
          relation: isMale
            ? "Maternal Grandfather"
            : isFemale
            ? "Maternal Grandmother"
            : "Grandparent",
          relationHi: isMale
            ? "नाना (माता के पिता)"
            : isFemale
            ? "नानी (माता की माता)"
            : "नाना-नानी",
          type: "ancestor",
        };
      }
    }
  }

  // 6. Is relative a grandchild of subject?
  if (allPersons.length > 0 && relative.parentIds.length > 0) {
    const parentOfRelative = allPersons.find(
      (p) =>
        relative.parentIds.includes(p.id) && p.parentIds.includes(subject.id),
    );
    if (parentOfRelative) {
      return {
        relation: isMale
          ? "Grandson"
          : isFemale
          ? "Granddaughter"
          : "Grandchild",
        relationHi: isMale ? "पोता / नाती" : isFemale ? "पोती / नातिन" : "पौत्र / पौत्री",
        type: "relative",
      };
    }
  }

  // 7. Fallback generic relative
  return {
    relation: "Family Relative",
    relationHi: "परिवारजन",
    type: "relative",
  };
}

