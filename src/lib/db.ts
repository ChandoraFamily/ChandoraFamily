import { dbConnect, isMongoAvailable } from "@/lib/mongoose";
import { PersonModel, PersonDocument } from "@/lib/models/Person";
import type { Person, PersonInput } from "@/types/person";
import path from "path";
import fs from "fs";

declare global {
  var _inMemoryPersons: Map<string, Person> | undefined;
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
    console.warn("Could not load lineage.people.json:", err);
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
  if (isMongoAvailable()) {
    try {
      await dbConnect();
      const docs = await PersonModel.find()
        .sort({ lastName: 1, firstName: 1 })
        .skip(opts.skip ?? 0)
        .limit(opts.limit ?? 50)
        .lean<PersonDocument[]>();
      return docs.map(toPerson);
    } catch (err) {
      console.warn("MongoDB query failed, using in-memory store: ", err);
    }
  }
  const store = getInMemoryPersons();
  const all = Array.from(store.values());
  all.sort((a, b) => {
    const ln = (a.firstName || "").localeCompare(b.firstName || "");
    return ln;
  });
  const skip = opts.skip ?? 0;
  const limit = opts.limit ?? 50;
  return all.slice(skip, skip + limit);
}

export async function getPerson(id: string): Promise<Person | null> {
  if (isMongoAvailable()) {
    try {
      await dbConnect();
      const doc = await PersonModel.findById(id).lean<PersonDocument>();
      return doc ? toPerson(doc) : null;
    } catch (err) {
      console.warn("MongoDB getPerson failed, using in-memory store:", err);
    }
  }
  const store = getInMemoryPersons();
  return store.get(id) ?? null;
}

export async function createPerson(input: PersonInput): Promise<Person> {
  if (isMongoAvailable()) {
    try {
      await dbConnect();
      const doc = await PersonModel.create({
        ...input,
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || undefined,
        lastName: input.lastName?.trim() || undefined,
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
  return person;
}

export async function updatePerson(
  id: string,
  patch: Partial<PersonInput>,
): Promise<Person | null> {
  if (isMongoAvailable()) {
    try {
      await dbConnect();
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
  return updated;
}

export async function deletePerson(id: string): Promise<boolean> {
  if (isMongoAvailable()) {
    try {
      await dbConnect();
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
  return true;
}

export async function searchPersons(
  query: string,
  opts: { limit?: number; skip?: number } = {},
): Promise<Person[]> {
  const q = query.trim();
  if (!q) return listPersons(opts);

  if (isMongoAvailable()) {
    try {
      await dbConnect();
      const regex = new RegExp(q, "i");
      const docs = await PersonModel.find({
        $or: [
          { firstName: regex },
          { middleName: regex },
          { lastName: regex },
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
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (personId === relatedId) {
    return { ok: false, error: "A person cannot be related to themself." };
  }

  if (isMongoAvailable()) {
    try {
      await dbConnect();
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
          return { ok: false, error: "This person already has two parents." };
        }
        b.parentIds.push(a.id);
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
    store.set(a.id, { ...a, spouseIds: Array.from(aSpouse) });
    store.set(b.id, { ...b, spouseIds: Array.from(bSpouse) });
  } else {
    if (b.parentIds.includes(a.id)) {
      return { ok: false, error: "Relationship already exists." };
    }
    if (b.parentIds.length >= 2) {
      return { ok: false, error: "This person already has two parents." };
    }
    store.set(b.id, { ...b, parentIds: [...b.parentIds, a.id] });
  }

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
    });
    store.set(b.id, {
      ...b,
      spouseIds: b.spouseIds.filter((id) => id !== a.id),
    });
  } else {
    store.set(b.id, {
      ...b,
      parentIds: b.parentIds.filter((id) => id !== a.id),
    });
  }

  return { ok: true };
}

export async function listAllPersonsForTree(): Promise<Person[]> {
  if (isMongoAvailable()) {
    try {
      await dbConnect();
      const docs = await PersonModel.find()
        .select(
          "firstName middleName lastName maidenName gender birthDate deathDate birthPlace deathPlace parentIds spouseIds createdAt updatedAt",
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
