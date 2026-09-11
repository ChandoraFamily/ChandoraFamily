import { getConnection } from "@/lib/db-connections";
import { PersonSchema, PersonDocument } from "./Person";
import { UserSchema, UserDocument } from "./User";
import { ContactMessageSchema, ContactMessageDocument } from "./ContactMessage";
import { SuggestedEditSchema, SuggestedEditDocument } from "./SuggestEdit";

// Genealogy data (persons/relationships) lives in one database; accounts,
// the contact inbox, and suggested edits live in a separate one. Point
// MONGODB_URI_GENEALOGY and MONGODB_URI_USERS at two different
// clusters/databases in .env.local to physically split them. Either can be
// omitted, in which case it falls back to MONGODB_URI (see db-connections.ts),
// so the app still runs against a single database out of the box.

let cache: {
  Person: ReturnType<typeof buildPersonModel>;
  User: ReturnType<typeof buildUserModel>;
  ContactMessage: ReturnType<typeof buildContactModel>;
  SuggestEdit: ReturnType<typeof buildSuggestEditModel>;
} | null = null;

function buildPersonModel() {
  const conn = getConnection("lineage");
  return (
    conn.models.Person || conn.model<PersonDocument>("Person", PersonSchema)
  );
}
function buildUserModel() {
  const conn = getConnection("users");
  return conn.models.User || conn.model<UserDocument>("User", UserSchema);
}
function buildContactModel() {
  const conn = getConnection("users");
  return (
    conn.models.ContactMessage ||
    conn.model<ContactMessageDocument>("ContactMessage", ContactMessageSchema)
  );
}
function buildSuggestEditModel() {
  const conn = getConnection("users");
  return (
    conn.models.SuggestedEdit ||
    conn.model<SuggestedEditDocument>("SuggestedEdit", SuggestedEditSchema)
  );
}

export function getModels() {
  if (!cache) {
    cache = {
      Person: buildPersonModel(),
      User: buildUserModel(),
      ContactMessage: buildContactModel(),
      SuggestEdit: buildSuggestEditModel(),
    };
  }
  return cache;
}
