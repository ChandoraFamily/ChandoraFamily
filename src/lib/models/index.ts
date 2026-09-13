import { getConnection } from "@/lib/db-connections";
import { PersonSchema, PersonDocument, PersonModel } from "./Person";
import { UserSchema, UserDocument, UserModel } from "./User";
import {
  ContactMessageSchema,
  ContactMessageDocument,
  ContactMessageModel,
} from "./ContactMessage";
import {
  SuggestedEditSchema,
  SuggestedEditDocument,
  SuggestedEditModel,
} from "./SuggestEdit";
import bcrypt from "bcryptjs";

declare global {
  var _inMemoryUsers: Map<string, any> | undefined;
  var _inMemorySuggestEdits: Map<string, any> | undefined;
  var _inMemoryContactMessages: any[] | undefined;
}

function getInMemoryUsers() {
  if (!global._inMemoryUsers) {
    const store = new Map<string, any>();
    const defaultPasswordHash = bcrypt.hashSync("admin123", 10);
    const users = [
      {
        _id: "6aa19ec9d59615212690b13e",
        email: "ajaykumarchandora@gmail.com",
        name: "Ajay Kumar",
        passwordHash: defaultPasswordHash,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: "user_admin_chandora",
        email: "admin@chandora.com",
        name: "Admin",
        passwordHash: defaultPasswordHash,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const u of users) {
      store.set(u.email.toLowerCase(), u);
    }
    global._inMemoryUsers = store;
  }
  return global._inMemoryUsers;
}

function getInMemorySuggestEdits() {
  if (!global._inMemorySuggestEdits) {
    global._inMemorySuggestEdits = new Map<string, any>();
  }
  return global._inMemorySuggestEdits;
}

function getInMemoryContactMessages() {
  if (!global._inMemoryContactMessages) {
    global._inMemoryContactMessages = [];
  }
  return global._inMemoryContactMessages;
}

function buildFallbackUserModel(): any {
  return {
    modelName: "User",
    collection: { name: "users" },
    db: { name: "users" },
    async findOne(query: { email?: string }) {
      if (!query?.email) return null;
      const store = getInMemoryUsers();
      const user = store.get(query.email.toLowerCase());
      if (!user) return null;
      return {
        ...user,
        save: async function () {
          store.set(user.email.toLowerCase(), { ...user, ...this });
          return this;
        },
      };
    },
    async findById(id: string) {
      const store = getInMemoryUsers();
      for (const u of store.values()) {
        if (u._id === id || String(u._id) === id) {
          return {
            ...u,
            save: async function () {
              store.set(u.email.toLowerCase(), { ...u, ...this });
              return this;
            },
          };
        }
      }
      return null;
    },
    async create(data: any) {
      const store = getInMemoryUsers();
      const id = "user_" + Math.random().toString(36).slice(2, 11);
      const user = {
        _id: id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(data.email.toLowerCase(), user);
      return {
        ...user,
        save: async function () {
          store.set(data.email.toLowerCase(), { ...user, ...this });
          return this;
        },
      };
    },
  };
}

function buildFallbackSuggestEditModel(): any {
  return {
    modelName: "SuggestedEdit",
    collection: { name: "suggestededits" },
    db: { name: "users" },
    async create(data: any) {
      const store = getInMemorySuggestEdits();
      const id = "edit_" + Math.random().toString(36).slice(2, 11);
      const edit = {
        _id: id,
        ...data,
        status: data.status || "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.set(id, edit);
      return edit;
    },
    find(filter?: { status?: string }) {
      return {
        sort(sortObj: any) {
          return {
            async lean() {
              const store = getInMemorySuggestEdits();
              let all = Array.from(store.values());
              if (filter?.status) {
                all = all.filter((e) => e.status === filter.status);
              }
              return all.sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              );
            },
          };
        },
      };
    },
    async findById(id: string) {
      const store = getInMemorySuggestEdits();
      const edit = store.get(id);
      if (!edit) return null;
      return {
        ...edit,
        save: async function () {
          store.set(id, { ...edit, ...this, updatedAt: new Date() });
          return this;
        },
      };
    },
  };
}

function buildFallbackContactModel(): any {
  return {
    modelName: "ContactMessage",
    collection: { name: "contactmessages" },
    db: { name: "users" },
    async create(data: any) {
      const list = getInMemoryContactMessages();
      const msg = {
        _id: "msg_" + Math.random().toString(36).slice(2, 11),
        ...data,
        status: data.status || "new",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      list.push(msg);
      return msg;
    },
    find() {
      return {
        sort(sortObj: any) {
          return {
            async lean() {
              const list = getInMemoryContactMessages();
              return [...list].sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              );
            },
          };
        },
      };
    },
  };
}

export function getModels() {
  const usersConn = getConnection("users");
  const lineageConn = getConnection("lineage");

  const hasMongoUsers =
    usersConn &&
    usersConn.readyState === 1 &&
    Boolean(process.env.MONGODB_URI || process.env.MONGODB_URI_USERS);
  const hasMongoLineage =
    lineageConn &&
    lineageConn.readyState === 1 &&
    Boolean(process.env.MONGODB_URI || process.env.MONGODB_URI_GENEALOGY);

  return {
    Person: hasMongoLineage
      ? lineageConn.models.Person ||
        lineageConn.model<PersonDocument>("Person", PersonSchema)
      : PersonModel,
    User: hasMongoUsers
      ? usersConn.models.User ||
        usersConn.model<UserDocument>("User", UserSchema)
      : buildFallbackUserModel(),
    ContactMessage: hasMongoUsers
      ? usersConn.models.ContactMessage ||
        usersConn.model<ContactMessageDocument>(
          "ContactMessage",
          ContactMessageSchema,
        )
      : buildFallbackContactModel(),
    SuggestEdit: hasMongoUsers
      ? usersConn.models.SuggestedEdit ||
        usersConn.model<SuggestedEditDocument>(
          "SuggestedEdit",
          SuggestedEditSchema,
        )
      : buildFallbackSuggestEditModel(),
  };
}
