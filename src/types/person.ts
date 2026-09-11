export type Gender = "male" | "female" | "other" | "unknown";

export interface Person {
  id: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  maidenName?: string;
  gender: Gender;
  birthDate?: string; // ISO date, may be partial e.g. "1932" or "1932-05"
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  photoUrl?: string;
  bio?: string;
  /** Direct parent ids (max 2 in normal use, but not enforced). */
  parentIds: string[];
  /** Current/former spouse or partner ids. */
  spouseIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type PersonInput = Omit<
  Person,
  "id" | "createdAt" | "updatedAt" | "parentIds" | "spouseIds"
> & {
  parentIds?: string[];
  spouseIds?: string[];
};

export interface RelationshipRequest {
  type: "parent-child" | "spouse";
  /** For parent-child: the parent's id. For spouse: either person's id. */
  personId: string;
  /** For parent-child: the child's id. For spouse: the other spouse's id. */
  relatedId: string;
}

/** A node in the rendered family-tree graph, positioned in generation/slot space. */
export interface TreeNode {
  id: string;
  person: Person;
  generation: number; // 0 = focal person, negative = ancestors, positive = descendants
  slot: number; // horizontal position within its generation
  isFocus: boolean;
}

export interface TreeEdge {
  type: "parent-child" | "spouse";
  from: string;
  to: string;
}

export interface FamilyTreeGraph {
  focusId: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  hasMoreAncestors: boolean;
  hasMoreDescendants: boolean;
}
