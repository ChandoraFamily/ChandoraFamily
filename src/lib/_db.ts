import fs from "fs";
import path from "path";
import { dbConnect, isMongoAvailable } from "@/lib/mongoose";
import { PersonModel, PersonDocument } from "@/lib/models/Person";
import type { Person, PersonInput, ConnectedRelative } from "@/types/person";
import { getRelativeRelation } from "@/lib/relationship";

declare global {
  // eslint-disable-next-line no-var
  var _inMemoryPersons: Map<string, Person> | undefined;
  // eslint-disable-next-line no-var
  var _defaultFocusId: string | undefined;
}

function getInMemoryPersons(): Map<string, Person> {
  if (global._inMemoryPersons) return global._inMemoryPersons;
  const store = new Map<string, Person>();
  try {
    const filePath = path.join(process.cwd(), "assets", "lineage.people.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          const id =
            item._id?.$oid ||
            (typeof item._id === "string" ? item._id : item._id?.toString?.());
          if (!id) continue;
          let createdAt = new Date(0).toISOString();
          if (item.createdAt?.$date) {
            createdAt = new Date(item.createdAt.$date).toISOString();
          } else if (typeof item.createdAt === "string") {
            createdAt = item.createdAt;
          }
          let updatedAt = createdAt;
          if (item.updatedAt?.$date) {
            updatedAt = new Date(item.updatedAt.$date).toISOString();
          } else if (typeof item.updatedAt === "string") {
            updatedAt = item.updatedAt;
          }
          const p: Person = {
            id,
            firstName: item.firstName || "",
            middleName: item.middleName || undefined,
            lastName: item.lastName || undefined,
            hindiName: item.hindiName || undefined,
            maidenName: item.maidenName || undefined,
            gender: item.gender || "unknown",
            birthDate: item.birthDate || undefined,
            deathDate: item.deathDate || undefined,
            birthPlace: item.birthPlace || undefined,
            deathPlace: item.deathPlace || undefined,
            photoUrl: item.photoUrl || undefined,
            bio: item.bio || undefined,
            parentIds: Array.isArray(item.parentIds) ? item.parentIds : [],
            spouseIds: Array.isArray(item.spouseIds) ? item.spouseIds : [],
            createdAt,
            updatedAt,
          };
          store.set(id, p);
        }
      }
    }
  } catch (err) {
    console.warn("[AI Studio] Could not load lineage.people.json:", err);
  }
  global._inMemoryPersons = store;
  return store;
}

function toPerson(doc: PersonDocument): Person {
  const createdAt = doc.createdAt ?? new Date(0);
  const updatedAt = doc.updatedAt ?? doc.createdAt ?? new Date(0);
  return {
    id: doc._id.toString(),
    firstName: doc.firstName,
    middleName: doc.middleName,
    lastName: doc.lastName,
    hindiName: doc.hindiName,
    maidenName: doc.maidenName,
    gender: doc.gender,
    birthDate: doc.birthDate,
    deathDate: doc.deathDate,
    birthPlace: doc.birthPlace,
    deathPlace: doc.deathPlace,
    photoUrl: doc.photoUrl,
    bio: doc.bio,
    parentIds: doc.parentIds ?? [],
    spouseIds: doc.spouseIds ?? [],
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export async function listPersons(
  opts: { limit?: number; skip?: number } = {},
): Promise<Person[]> {
  await dbConnect();
  if (isMongoAvailable()) {
    try {
      const docs = await PersonModel.find()
        .sort({ lastName: 1, firstName: 1 })
        .skip(opts.skip ?? 0)
        .limit(opts.limit ?? 50)
        .lean<PersonDocument[]>();
      return docs.map(toPerson);
    } catch (err) {
      console.warn("MongoDB query failed, using in-memory store:", err);
    }
  }
  const store = getInMemoryPersons();
  const all = Array.from(store.values());
  all.sort((a, b) => {
    const ln = (a.lastName || "").localeCompare(b.lastName || "");
    if (ln !== 0) return ln;
    return (a.firstName || "").localeCompare(b.firstName || "");
  });
  const skip = opts.skip ?? 0;
  const limit = opts.limit ?? 50;
  return all.slice(skip, skip + limit);
}

export async function getPerson(id: string): Promise<Person | null> {
  await dbConnect();
  if (isMongoAvailable()) {
    try {
      const doc = await PersonModel.findById(id).lean<PersonDocument>();
      if (doc) return toPerson(doc);
    } catch (err) {
      console.warn("MongoDB getPerson failed, using in-memory store:", err);
    }
  }
  const store = getInMemoryPersons();
  return store.get(id) ?? null;
}

export async function createPerson(input: PersonInput): Promise<Person> {
  await dbConnect();
  if (isMongoAvailable()) {
    try {
      const doc = await PersonModel.create({
        ...input,
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || undefined,
        lastName: input.lastName?.trim() || undefined,
        hindiName: input.hindiName?.trim() || undefined,
        maidenName: input.maidenName?.trim() || undefined,
        parentIds: input.parentIds ?? [],
        spouseIds: input.spouseIds ?? [],
      });
      return toPerson(doc.toObject());
    } catch (err) {
      console.warn("MongoDB createPerson failed, using in-memory store:", err);
    }
  }

  const store = getInMemoryPersons();
  const hex = Math.random().toString(16).slice(2, 10);
  const id = `6aa1${hex}${Date.now().toString(16).slice(-12)}`.slice(0, 24);
  const now = new Date().toISOString();
  const person: Person = {
    id,
    firstName: input.firstName.trim(),
    middleName: input.middleName?.trim() || undefined,
    lastName: input.lastName?.trim() || undefined,
    hindiName: input.hindiName?.trim() || undefined,
    maidenName: input.maidenName?.trim() || undefined,
    gender: input.gender,
    birthDate: input.birthDate || undefined,
    deathDate: input.deathDate || undefined,
    birthPlace: input.birthPlace || undefined,
    deathPlace: input.deathPlace || undefined,
    photoUrl: input.photoUrl || undefined,
    bio: input.bio || undefined,
    parentIds: input.parentIds ?? [],
    spouseIds: input.spouseIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
  store.set(id, person);
  // saveInMemoryPersonsToFile();
  return person;
}

export async function updatePerson(
  id: string,
  patch: Partial<PersonInput>,
): Promise<Person | null> {
  await dbConnect();
  if (isMongoAvailable()) {
    try {
      const doc = await PersonModel.findByIdAndUpdate(
        id,
        { $set: patch },
        { new: true },
      ).lean<PersonDocument>();
      if (doc) return toPerson(doc);
    } catch (err) {
      console.warn("MongoDB updatePerson failed, using in-memory store:", err);
    }
  }

  const store = getInMemoryPersons();
  const existing = store.get(id);
  if (!existing) return null;

  const updated: Person = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  // saveInMemoryPersonsToFile();
  return updated;
}

export async function deletePerson(id: string): Promise<boolean> {
  await dbConnect();
  if (isMongoAvailable()) {
    try {
      const res = await PersonModel.findByIdAndDelete(id);
      if (!res) return false;
      await PersonModel.updateMany(
        {},
        { $pull: { parentIds: id, spouseIds: id } },
      );
      return true;
    } catch (err) {
      console.warn("MongoDB deletePerson failed, using in-memory store:", err);
    }
  }

  const store = getInMemoryPersons();
  if (!store.has(id)) return false;
  store.delete(id);

  // Detach this person from anyone who referenced them.
  for (const person of store.values()) {
    let changed = false;
    let newParents = person.parentIds;
    let newSpouses = person.spouseIds;
    if (newParents.includes(id)) {
      newParents = newParents.filter((pId) => pId !== id);
      changed = true;
    }
    if (newSpouses.includes(id)) {
      newSpouses = newSpouses.filter((sId) => sId !== id);
      changed = true;
    }
    if (changed) {
      store.set(person.id, {
        ...person,
        parentIds: newParents,
        spouseIds: newSpouses,
        updatedAt: new Date().toISOString(),
      });
    }
  }
  // saveInMemoryPersonsToFile();
  return true;
}

export async function searchPersons(
  query: string,
  opts: { limit?: number; skip?: number } = {},
): Promise<Person[]> {
  const q = query.trim();
  if (!q) return listPersons(opts);
  await dbConnect();

  if (isMongoAvailable()) {
    try {
      const regex = new RegExp(q, "i");
      const docs = await PersonModel.find({
        $or: [
          { firstName: regex },
          { middleName: regex },
          { lastName: regex },
          { hindiName: regex },
          { maidenName: regex },
          { birthPlace: regex },
          { deathPlace: regex },
        ],
      })
        .skip(opts.skip ?? 0)
        .limit(opts.limit ?? 50)
        .lean<PersonDocument[]>();
      return docs.map(toPerson);
    } catch (err) {
      console.warn("MongoDB searchPersons failed, using in-memory store:", err);
    }
  }

  const store = getInMemoryPersons();
  const lower = q.toLowerCase();
  const matched: Person[] = [];

  for (const person of store.values()) {
    const text = [
      person.firstName,
      person.middleName,
      person.lastName,
      person.hindiName,
      person.maidenName,
      person.birthPlace,
      person.deathPlace,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (text.includes(lower)) {
      matched.push(person);
    }
  }

  const skip = opts.skip ?? 0;
  const limit = opts.limit ?? 50;
  return matched.slice(skip, skip + limit);
}

export async function addRelationship(
  type: "parent-child" | "spouse",
  personId: string,
  relatedId: string,
  options?: { replaceParentId?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (personId === relatedId) {
    return { ok: false, error: "A person cannot be related to themself." };
  }

  await dbConnect();
  if (isMongoAvailable()) {
    try {
      const [a, b] = await Promise.all([
        PersonModel.findById(personId),
        PersonModel.findById(relatedId),
      ]);
      if (!a || !b) return { ok: false, error: "Person not found." };

      if (type === "spouse") {
        if (!a.spouseIds.includes(b.id)) a.spouseIds.push(b.id);
        if (!b.spouseIds.includes(a.id)) b.spouseIds.push(a.id);
      } else {
        if (b.parentIds.includes(a.id)) {
          return { ok: false, error: "Relationship already exists." };
        }
        if (b.parentIds.length >= 2) {
          if (
            options?.replaceParentId &&
            b.parentIds.includes(options.replaceParentId)
          ) {
            b.parentIds = b.parentIds.map((pid: string) =>
              pid === options.replaceParentId ? a.id : pid,
            );
          } else {
            return { ok: false, error: "This person already has two parents." };
          }
        } else {
          b.parentIds.push(a.id);
        }
      }
      await Promise.all([a.save(), b.save()]);
      return { ok: true };
    } catch (err) {
      console.warn(
        "MongoDB addRelationship failed, using in-memory store:",
        err,
      );
    }
  }

  const store = getInMemoryPersons();
  const a = store.get(personId);
  const b = store.get(relatedId);
  if (!a || !b) return { ok: false, error: "Person not found." };

  if (type === "spouse") {
    const aSpouse = new Set(a.spouseIds);
    const bSpouse = new Set(b.spouseIds);
    aSpouse.add(b.id);
    bSpouse.add(a.id);
    store.set(a.id, {
      ...a,
      spouseIds: Array.from(aSpouse),
      updatedAt: new Date().toISOString(),
    });
    store.set(b.id, {
      ...b,
      spouseIds: Array.from(bSpouse),
      updatedAt: new Date().toISOString(),
    });
  } else {
    if (b.parentIds.includes(a.id)) {
      return { ok: false, error: "Relationship already exists." };
    }
    if (b.parentIds.length >= 2) {
      if (
        options?.replaceParentId &&
        b.parentIds.includes(options.replaceParentId)
      ) {
        const newParents = b.parentIds.map((pid) =>
          pid === options.replaceParentId ? a.id : pid,
        );
        store.set(b.id, {
          ...b,
          parentIds: newParents,
          updatedAt: new Date().toISOString(),
        });
      } else {
        return { ok: false, error: "This person already has two parents." };
      }
    } else {
      store.set(b.id, {
        ...b,
        parentIds: [...b.parentIds, a.id],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  saveInMemoryPersonsToFile();
  return { ok: true };
}

export async function removeRelationship(
  type: "parent-child" | "spouse",
  personId: string,
  relatedId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (isMongoAvailable()) {
    try {
      await dbConnect();
      const [a, b] = await Promise.all([
        PersonModel.findById(personId),
        PersonModel.findById(relatedId),
      ]);
      if (!a || !b) return { ok: false, error: "Person not found." };

      if (type === "spouse") {
        a.spouseIds = a.spouseIds.filter((id) => id !== b.id);
        b.spouseIds = b.spouseIds.filter((id) => id !== a.id);
      } else {
        b.parentIds = b.parentIds.filter((id) => id !== a.id);
      }
      await Promise.all([a.save(), b.save()]);
      return { ok: true };
    } catch (err) {
      console.warn(
        "MongoDB removeRelationship failed, using in-memory store:",
        err,
      );
    }
  }

  const store = getInMemoryPersons();
  const a = store.get(personId);
  const b = store.get(relatedId);
  if (!a || !b) return { ok: false, error: "Person not found." };

  if (type === "spouse") {
    store.set(a.id, {
      ...a,
      spouseIds: a.spouseIds.filter((id) => id !== b.id),
      updatedAt: new Date().toISOString(),
    });
    store.set(b.id, {
      ...b,
      spouseIds: b.spouseIds.filter((id) => id !== a.id),
      updatedAt: new Date().toISOString(),
    });
  } else {
    store.set(b.id, {
      ...b,
      parentIds: b.parentIds.filter((id) => id !== a.id),
      updatedAt: new Date().toISOString(),
    });
  }

  saveInMemoryPersonsToFile();
  return { ok: true };
}

export async function listAllPersonsForTree(): Promise<Person[]> {
  if (isMongoAvailable()) {
    try {
      await dbConnect();
      const docs = await PersonModel.find()
        .select(
          "firstName middleName lastName hindiName maidenName gender birthDate deathDate birthPlace deathPlace parentIds spouseIds createdAt updatedAt",
        )
        .lean<PersonDocument[]>();
      return docs.map(toPerson);
    } catch (err) {
      console.warn(
        "MongoDB listAllPersonsForTree failed, using in-memory store:",
        err,
      );
    }
  }

  const store = getInMemoryPersons();
  return Array.from(store.values());
}

/**
 * Returns all directly connected relatives for a person:
 * Parents, Spouses, Children, Siblings, and other close blood relatives,
 * complete with their relationship relation title in English and Hindi.
 */
export async function getConnectedRelatives(
  personId: string,
): Promise<ConnectedRelative[]> {
  const persons = await listAllPersonsForTree();
  const person = persons.find((p) => p.id === personId);
  if (!person) return [];

  const results: ConnectedRelative[] = [];
  const seenIds = new Set<string>();

  // 1. Direct Parents
  for (const parentId of person.parentIds) {
    const parent = persons.find((p) => p.id === parentId);
    if (parent && !seenIds.has(parent.id)) {
      seenIds.add(parent.id);
      const relInfo = getRelativeRelation(person, parent, persons);
      results.push({
        person: parent,
        relation: relInfo.relation,
        relationHi: relInfo.relationHi,
        type: "parent",
      });
    }
  }

  // 2. Direct Spouses
  for (const spouseId of person.spouseIds) {
    const spouse = persons.find((p) => p.id === spouseId);
    if (spouse && !seenIds.has(spouse.id)) {
      seenIds.add(spouse.id);
      const relInfo = getRelativeRelation(person, spouse, persons);
      results.push({
        person: spouse,
        relation: relInfo.relation,
        relationHi: relInfo.relationHi,
        type: "spouse",
      });
    }
  }

  // Also check if anyone else has personId in their spouseIds
  for (const p of persons) {
    if (
      p.id !== personId &&
      !seenIds.has(p.id) &&
      p.spouseIds.includes(personId)
    ) {
      seenIds.add(p.id);
      const relInfo = getRelativeRelation(person, p, persons);
      results.push({
        person: p,
        relation: relInfo.relation,
        relationHi: relInfo.relationHi,
        type: "spouse",
      });
    }
  }

  // 3. Children (persons where parentIds contains personId)
  for (const p of persons) {
    if (
      p.id !== personId &&
      !seenIds.has(p.id) &&
      p.parentIds.includes(personId)
    ) {
      seenIds.add(p.id);
      const relInfo = getRelativeRelation(person, p, persons);
      results.push({
        person: p,
        relation: relInfo.relation,
        relationHi: relInfo.relationHi,
        type: "child",
      });
    }
  }

  // 4. Siblings (persons sharing at least one parent, and not person themselves)
  if (person.parentIds.length > 0) {
    for (const p of persons) {
      if (
        p.id !== personId &&
        !seenIds.has(p.id) &&
        p.parentIds.some((pid) => person.parentIds.includes(pid))
      ) {
        seenIds.add(p.id);
        const relInfo = getRelativeRelation(person, p, persons);
        results.push({
          person: p,
          relation: relInfo.relation,
          relationHi: relInfo.relationHi,
          type: "sibling",
        });
      }
    }
  }

  return results;
}

export const DEFAULT_ADMIN_PERSON_ID = "6aa19ec9d59615212690b13e";

export async function getAdminPerson(): Promise<Person | null> {
  // First priority: direct lookup of known admin person ID
  const direct = await getPerson(DEFAULT_ADMIN_PERSON_ID);
  if (direct) return direct;

  // Second priority: search in memory / DB for Ajay Kumar
  const all = await listAllPersonsForTree();
  const match = all.find(
    (p) =>
      p.firstName.toLowerCase() === "ajay" &&
      (p.middleName?.toLowerCase() === "kumar" ||
        p.lastName?.toLowerCase() === "chandora" ||
        p.birthPlace?.toLowerCase() === "ganganagar"),
  );
  if (match) return match;

  // Third priority: any person named Ajay
  const fallbackMatch = all.find((p) => p.firstName.toLowerCase() === "ajay");
  if (fallbackMatch) return fallbackMatch;

  // Fallback to first available person
  return all[0] ?? null;
}

export async function getDefaultFocusId(): Promise<string> {
  if (global._defaultFocusId) {
    const existing = await getPerson(global._defaultFocusId);
    if (existing) return existing.id;
  }

  // Check persisted config file if present
  try {
    const configPath = path.join(
      process.cwd(),
      "assets",
      "lineage.config.json",
    );
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.defaultFocusId) {
        const p = await getPerson(parsed.defaultFocusId);
        if (p) {
          global._defaultFocusId = p.id;
          return p.id;
        }
      }
    }
  } catch (err) {
    console.warn("Could not read lineage.config.json:", err);
  }

  // Next: default to admin person
  const admin = await getAdminPerson();
  if (admin) {
    global._defaultFocusId = admin.id;
    return admin.id;
  }

  // Fallback: first person from store
  const list = await listPersons({ limit: 1 });
  return list[0]?.id || DEFAULT_ADMIN_PERSON_ID;
}

export async function setDefaultFocusId(id: string): Promise<boolean> {
  const p = await getPerson(id);
  if (!p) return false;

  global._defaultFocusId = id;
  try {
    const configPath = path.join(
      process.cwd(),
      "assets",
      "lineage.config.json",
    );
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        { defaultFocusId: id, updatedAt: new Date().toISOString() },
        null,
        2,
      ),
      "utf-8",
    );
  } catch (err) {
    console.warn("Could not write lineage.config.json:", err);
  }
  return true;
}

export function saveInMemoryPersonsToFile(): boolean {
  try {
    const store = getInMemoryPersons();
    const list = Array.from(store.values()).map((p) => ({
      _id: { $oid: p.id },
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
      hindiName: p.hindiName,
      maidenName: p.maidenName,
      gender: p.gender,
      birthDate: p.birthDate,
      deathDate: p.deathDate,
      birthPlace: p.birthPlace,
      deathPlace: p.deathPlace,
      photoUrl: p.photoUrl,
      bio: p.bio,
      parentIds: p.parentIds,
      spouseIds: p.spouseIds,
      createdAt: { $date: p.createdAt },
      updatedAt: { $date: p.updatedAt },
    }));

    const filePath = path.join(process.cwd(), "assets", "lineage.people.json");
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save lineage.people.json:", err);
    return false;
  }
}

export async function bulkUpdateHindiNames(
  updates: Array<{ id: string; hindiName: string }>,
): Promise<number> {
  const store = getInMemoryPersons();
  let count = 0;

  for (const { id, hindiName } of updates) {
    const existing = store.get(id);
    if (existing) {
      existing.hindiName = hindiName;
      existing.updatedAt = new Date().toISOString();
      store.set(id, existing);
      count++;
    }
  }

  if (isMongoAvailable()) {
    try {
      await dbConnect();
      const bulkOps = updates.map(({ id, hindiName }) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { hindiName } },
        },
      }));
      if (bulkOps.length > 0) {
        await PersonModel.bulkWrite(bulkOps);
      }
    } catch (err) {
      console.warn("MongoDB bulkWrite failed:", err);
    }
  }

  saveInMemoryPersonsToFile();
  return count;
}
