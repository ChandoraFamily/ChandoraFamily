import type {
  Person,
  FamilyTreeGraph,
  TreeNode,
  TreeEdge,
} from "@/types/person";

/**
 * Builds a generation-layered graph centered on `focusId`, going up to
 * `upDepth` generations of direct ancestors and `downDepth` generations
 * below the focus person — but at every generation, ALL relatives sharing
 * an ancestor in that window are included (siblings, cousins, aunts/uncles),
 * not just the direct ancestor/descendant chain of the focus person.
 */
export function buildFamilyTree(
  persons: Person[],
  focusId: string,
  upDepth = 3,
  downDepth = 3,
  expandAncestorSiblings = false,
): FamilyTreeGraph {
  const byId = new Map(persons.map((p) => [p.id, p]));
  const focus = byId.get(focusId);
  if (!focus) {
    return {
      focusId,
      nodes: [],
      edges: [],
      hasMoreAncestors: false,
      hasMoreDescendants: false,
    };
  }

  const generation = new Map<string, number>();
  const edges: TreeEdge[] = [];
  const edgeKeys = new Set<string>();

  const addEdge = (edge: TreeEdge) => {
    const key = `${edge.type}:${edge.from}:${edge.to}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push(edge);
    }
  };

  const setGen = (id: string, gen: number) => {
    if (!generation.has(id)) generation.set(id, gen);
  };

  const addSpouses = (id: string, gen: number) => {
    for (const spouseId of byId.get(id)?.spouseIds ?? []) {
      if (!byId.has(spouseId)) continue;
      addEdge({ type: "spouse", from: id, to: spouseId });
      setGen(spouseId, gen);
    }
  };

  // Pre-index children so "who are this person's children" is O(1) instead
  // of re-scanning the whole person list at every node of the walk.
  const childrenIndex = new Map<string, Person[]>();
  for (const p of persons) {
    for (const parentId of p.parentIds) {
      if (!childrenIndex.has(parentId)) childrenIndex.set(parentId, []);
      childrenIndex.get(parentId)!.push(p);
    }
  }

  // Phase 1: walk the direct ancestor chain up to `upDepth`, recording
  // every ancestor (and the focus person) along with its generation.
  const ancestors: { id: string; gen: number }[] = [];
  const upVisited = new Set<string>();
  const walkUp = (id: string, gen: number, depth: number) => {
    if (upVisited.has(id) || depth > upDepth) return;
    upVisited.add(id);
    setGen(id, gen);
    addSpouses(id, gen);
    ancestors.push({ id, gen });
    const person = byId.get(id);
    if (!person) return;
    for (const parentId of person.parentIds) {
      if (!byId.has(parentId)) continue;
      addEdge({ type: "parent-child", from: parentId, to: id });
      walkUp(parentId, gen - 1, depth + 1);
    }
  };
  walkUp(focus.id, 0, 0);

  // Phase 2: from EVERY ancestor found above (not just the direct-line
  // child), walk ALL of their descendants down to an absolute generation
  // cap of `downDepth` relative to the focus person. This is what surfaces
  // siblings, cousins, and aunts/uncles alongside the direct line.
  const downVisited = new Set<string>();
  const walkDownFull = (id: string, gen: number) => {
    if (downVisited.has(id)) return;
    downVisited.add(id);
    setGen(id, gen);
    addSpouses(id, gen);
    if (gen >= downDepth) return;
    for (const child of childrenIndex.get(id) ?? []) {
      addEdge({ type: "parent-child", from: id, to: child.id });
      walkDownFull(child.id, gen + 1);
    }
  };

  if (expandAncestorSiblings) {
    for (const { id, gen } of ancestors) {
      walkDownFull(id, gen);
    }
  } else {
    walkDownFull(focus.id, 0);
  }

  // --- everything below is unchanged from before ---
  const byGeneration = new Map<number, string[]>();
  for (const [id, gen] of generation.entries()) {
    if (!byGeneration.has(gen)) byGeneration.set(gen, []);
    byGeneration.get(gen)!.push(id);
  }

  const nodes: TreeNode[] = [];
  for (const [gen, ids] of byGeneration.entries()) {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const idsSet = new Set(ids);

    for (const id of ids) {
      if (seen.has(id)) continue;
      ordered.push(id);
      seen.add(id);
      const person = byId.get(id);
      for (const spouseId of person?.spouseIds ?? []) {
        if (idsSet.has(spouseId) && !seen.has(spouseId)) {
          ordered.push(spouseId);
          seen.add(spouseId);
        }
      }
    }
    ordered.forEach((id, slot) => {
      const person = byId.get(id);
      if (!person) return;

      const minimalPerson = {
        id: person.id,
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        gender: person.gender,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        birthPlace: person.birthPlace,
        spouseIds: person.spouseIds,
        parentIds: person.parentIds,
      } as Person;

      nodes.push({
        id,
        person: minimalPerson,
        generation: gen,
        slot,
        isFocus: id === focus.id,
      });
    });
  }

  const minGen = Math.min(...generation.values());
  const maxGen = Math.max(...generation.values());

  const hasDeeperAncestors = Array.from(generation.entries())
    .filter(([, gen]) => gen === minGen)
    .some(([id]) =>
      (byId.get(id)?.parentIds ?? []).some(
        (pid) => byId.has(pid) && !generation.has(pid),
      ),
    );

  const hasHiddenAncestorSiblings =
    !expandAncestorSiblings &&
    ancestors.some(
      (a) => a.gen < 0 && (childrenIndex.get(a.id)?.length ?? 0) > 1,
    );

  const hasMoreDescendants = Array.from(generation.entries())
    .filter(([, gen]) => gen === maxGen)
    .some((entry) => {
      const [id] = entry;
      const children = childrenIndex.get(id) ?? [];
      return children.some((c) => !generation.has(c.id));
    });

  return {
    focusId: focus.id,
    nodes,
    edges,
    hasMoreAncestors: hasDeeperAncestors || hasHiddenAncestorSiblings,
    hasMoreDescendants,
  };
}
