export type Gender = "male" | "female" | "other" | "unknown";

export interface Person {
  id: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  hindiName?: string; // Full name in Devanagari Hindi (e.g. "अजय कुमार चंदोरा")
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
  /** Optional ID of an existing parent to replace if person already has 2 parents */
  replaceParentId?: string;
}

/** A node in the rendered family-tree graph, positioned in generation/slot space. */
export interface TreeNode {
  id: string;
  person: Person;
  generation: number; // 0 = focal person, negative = ancestors, positive = descendants
  slot: number; // horizontal position within its generation
  isFocus: boolean;
  hasMoreAncestors?: boolean;
  hasMoreDescendants?: boolean;
  unloadedAncestorsCount?: number;
  unloadedDescendantsCount?: number;
}

export interface TreeEdge {
  type: "parent-child" | "spouse";
  from: string;
  to: string;
}

export interface ConnectedRelative {
  person: Person;
  relation: string; // e.g. "Father", "Mother", "Wife", "Husband", "Son", "Daughter", "Brother", "Sister"
  relationHi: string; // e.g. "पिता", "माता", "पत्नी", "पति", "पुत्र", "पुत्री", "भाई", "बहन"
  type: "parent" | "spouse" | "child" | "sibling" | "ancestor" | "relative";
}

export interface FamilyTreeGraph {
  focusId: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  hasMoreAncestors: boolean;
  hasMoreDescendants: boolean;
  expandedAncestors?: string[];
  expandedDescendants?: string[];
}
