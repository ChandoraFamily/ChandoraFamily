import { dbConnect } from "@/lib/mongoose";
import { PersonModel, PersonDocument } from "@/lib/models/Person";
import type { Person, PersonInput } from "@/types/person";

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
  await dbConnect();
  const docs = await PersonModel.find()
    .sort({ lastName: 1, firstName: 1 })
    .skip(opts.skip ?? 0)
    .limit(opts.limit ?? 50)
    .lean<PersonDocument[]>();
  return docs.map(toPerson);
}

export async function getPerson(id: string): Promise<Person | null> {
  await dbConnect();
  const doc = await PersonModel.findById(id).lean<PersonDocument>();
  return doc ? toPerson(doc) : null;
}

export async function createPerson(input: PersonInput): Promise<Person> {
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
}

export async function updatePerson(
  id: string,
  patch: Partial<PersonInput>,
): Promise<Person | null> {
  await dbConnect();
  const doc = await PersonModel.findByIdAndUpdate(
    id,
    { $set: patch },
    { new: true },
  ).lean<PersonDocument>();
  return doc ? toPerson(doc) : null;
}

export async function deletePerson(id: string): Promise<boolean> {
  await dbConnect();
  const res = await PersonModel.findByIdAndDelete(id);
  if (!res) return false;
  // Detach this person from anyone who referenced them.
  await PersonModel.updateMany({}, { $pull: { parentIds: id, spouseIds: id } });
  return true;
}

export async function searchPersons(
  query: string,
  opts: { limit?: number; skip?: number },
): Promise<Person[]> {
  await dbConnect();
  const q = query.trim();
  if (!q) return listPersons();
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
}

export async function addRelationship(
  type: "parent-child" | "spouse",
  personId: string,
  relatedId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (personId === relatedId) {
    return { ok: false, error: "A person cannot be related to themself." };
  }
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
}

export async function removeRelationship(
  type: "parent-child" | "spouse",
  personId: string,
  relatedId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
}

// Used only by the tree-graph endpoint, which needs to see every person's
// parentIds/spouseIds to walk the graph correctly — unlike the paginated
// listPersons() used for browsing, this is never limited by page size.
// Only pulls the fields the tree actually needs to keep the payload light.
export async function listAllPersonsForTree(): Promise<Person[]> {
  await dbConnect();
  const docs = await PersonModel.find()
    .select(
      "firstName middleName lastName maidenName gender birthDate deathDate birthPlace deathPlace parentIds spouseIds createdAt updatedAt",
    )
    .lean<PersonDocument[]>();
  return docs.map(toPerson);
}
