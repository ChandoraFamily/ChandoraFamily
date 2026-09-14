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
  upDepth = 2,
  downDepth = 1,
  expandAncestorSiblings = false,
  expandedAncestors: string[] = [],
  expandedDescendants: string[] = [],
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
      expandedAncestors: [],
      expandedDescendants: [],
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
      if (depth < upDepth) {
        addEdge({ type: "parent-child", from: parentId, to: id });
        walkUp(parentId, gen - 1, depth + 1);
      }
    }
  };
  walkUp(focus.id, 0, 0);

  // Phase 2: from EVERY ancestor found above (not just the direct-line
  // child), walk ALL of their descendants down to an absolute generation
  // cap of `downDepth` relative to the focus person.
  const downVisited = new Set<string>();
  const walkDownFull = (id: string, gen: number, depth: number) => {
    if (downVisited.has(id) || depth > downDepth) return;
    downVisited.add(id);
    setGen(id, gen);
    addSpouses(id, gen);
    for (const child of childrenIndex.get(id) ?? []) {
      if (depth < downDepth) {
        addEdge({ type: "parent-child", from: id, to: child.id });
        walkDownFull(child.id, gen + 1, depth + 1);
      }
    }
  };

  if (expandAncestorSiblings) {
    for (const { id, gen } of ancestors) {
      walkDownFull(id, gen, 0);
    }
  } else {
    walkDownFull(focus.id, 0, 0);
  }

  // Phase 3: Progressive per-person ancestor expansion
  // For each person in expandedAncestors, include their parents and parents' spouses (1 gen up)
  const expandedAncestorsSet = new Set(expandedAncestors);
  let changed = true;
  let iters = 0;
  while (changed && iters < 50) {
    changed = false;
    iters++;
    for (const personId of Array.from(expandedAncestorsSet)) {
      if (!generation.has(personId)) continue;
      const currentGen = generation.get(personId)!;
      const person = byId.get(personId);
      if (!person) continue;
      for (const parentId of person.parentIds) {
        if (!byId.has(parentId)) continue;
        addEdge({ type: "parent-child", from: parentId, to: personId });
        if (!generation.has(parentId)) {
          setGen(parentId, currentGen - 1);
          addSpouses(parentId, currentGen - 1);
          changed = true;
        }
      }
    }
  }

  // Phase 4: Progressive per-person descendant expansion
  // For each person in expandedDescendants, include their children and children's spouses (1 gen down)
  const expandedDescendantsSet = new Set(expandedDescendants);
  changed = true;
  iters = 0;
  while (changed && iters < 50) {
    changed = false;
    iters++;
    for (const personId of Array.from(expandedDescendantsSet)) {
      if (!generation.has(personId)) continue;
      const currentGen = generation.get(personId)!;
      for (const child of childrenIndex.get(personId) ?? []) {
        addEdge({ type: "parent-child", from: personId, to: child.id });
        if (!generation.has(child.id)) {
          setGen(child.id, currentGen + 1);
          addSpouses(child.id, currentGen + 1);
          changed = true;
        }
      }
    }
  }

  // Phase 5: Re-link any parent-child and spouse connections between all nodes visible in generation
  for (const [id] of generation.entries()) {
    const p = byId.get(id);
    if (!p) continue;
    for (const pid of p.parentIds) {
      if (generation.has(pid)) {
        addEdge({ type: "parent-child", from: pid, to: id });
      }
    }
    for (const sid of p.spouseIds) {
      if (generation.has(sid)) {
        addEdge({ type: "spouse", from: id, to: sid });
      }
    }
  }

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

      const hasMoreAncestors = (person.parentIds ?? []).some(
        (pid) => byId.has(pid) && !generation.has(pid),
      );
      const hasMoreDescendants = (childrenIndex.get(id) ?? []).some(
        (child) => !generation.has(child.id),
      );
      const unloadedAncestorsCount = (person.parentIds ?? []).filter(
        (pid) => byId.has(pid) && !generation.has(pid),
      ).length;
      const unloadedDescendantsCount = (childrenIndex.get(id) ?? []).filter(
        (child) => !generation.has(child.id),
      ).length;

      const minimalPerson = {
        id: person.id,
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        hindiName: person.hindiName,
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
        hasMoreAncestors,
        hasMoreDescendants,
        unloadedAncestorsCount,
        unloadedDescendantsCount,
      });
    });
  }

  const hasGlobalMoreAncestors = nodes.some((n) => n.hasMoreAncestors);
  const hasGlobalMoreDescendants = nodes.some((n) => n.hasMoreDescendants);

  const validNodeIds = new Set(nodes.map((n) => n.id));
  const validEdges = edges.filter(
    (e) => validNodeIds.has(e.from) && validNodeIds.has(e.to),
  );

  return {
    focusId: focus.id,
    nodes,
    edges: validEdges,
    hasMoreAncestors: hasGlobalMoreAncestors,
    hasMoreDescendants: hasGlobalMoreDescendants,
    expandedAncestors,
    expandedDescendants,
  };
}
