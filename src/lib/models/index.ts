import { getConnection, ensureConnection } from "@/lib/db-connections";
import { Connection, Types } from "mongoose";
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
  // eslint-disable-next-line no-var
  var _inMemoryUsers: Map<string, any> | undefined;
  // eslint-disable-next-line no-var
  var _inMemorySuggestEdits: Map<string, any> | undefined;
  // eslint-disable-next-line no-var
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
    async findByIdAndUpdate(id: string, update: any) {
      const store = getInMemorySuggestEdits();
      const edit = store.get(id);
      if (!edit) return null;
      const updated = {
        ...edit,
        ...(update.$set || update),
        updatedAt: new Date(),
      };
      store.set(id, updated);
      return updated;
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
    async findById(id: string) {
      const list = getInMemoryContactMessages();
      const item = list.find((m) => String(m._id) === String(id));
      if (!item) return null;
      return {
        ...item,
        async save() {
          item.updatedAt = new Date();
          return item;
        },
      };
    },
    async findByIdAndUpdate(id: string, update: any) {
      const list = getInMemoryContactMessages();
      const item = list.find((m) => String(m._id) === String(id));
      if (!item) return null;
      if (update.$set) Object.assign(item, update.$set);
      else Object.assign(item, update);
      item.updatedAt = new Date();
      return item;
    },
    async findByIdAndDelete(id: string) {
      const list = getInMemoryContactMessages();
      const idx = list.findIndex((m) => String(m._id) === String(id));
      if (idx === -1) return null;
      const [removed] = list.splice(idx, 1);
      return removed;
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

function buildContactModel(lineageConn: Connection, usersConn: Connection): any {
  const lineageModel =
    lineageConn && lineageConn.readyState === 1
      ? lineageConn.models.ContactMessage ||
        lineageConn.model<ContactMessageDocument>(
          "ContactMessage",
          ContactMessageSchema,
        )
      : null;

  const usersModel =
    usersConn && usersConn.readyState === 1
      ? usersConn.models.ContactMessage ||
        usersConn.model<ContactMessageDocument>(
          "ContactMessage",
          ContactMessageSchema,
        )
      : null;

  const primaryModel = lineageModel || usersModel;
  if (!primaryModel) {
    return buildFallbackContactModel();
  }

  return {
    modelName: "ContactMessage",
    collection: primaryModel.collection,
    db: primaryModel.db,
    async create(data: any) {
      let createdDoc: any = null;
      if (lineageModel) {
        try {
          createdDoc = await lineageModel.create(data);
        } catch (err: any) {
          console.warn("[AI Studio] Failed to create contact message in lineage DB:", err.message);
        }
      }
      if (usersModel) {
        try {
          const docData = createdDoc
            ? { ...data, _id: createdDoc._id }
            : data;
          const uDoc = await usersModel.create(docData);
          if (!createdDoc) createdDoc = uDoc;
        } catch (err: any) {
          console.warn("[AI Studio] Failed to mirror contact message in users DB:", err.message);
        }
      }
      if (!createdDoc) {
        const fallback = buildFallbackContactModel();
        createdDoc = await fallback.create(data);
      }
      return createdDoc;
    },
    find(filter: any = {}) {
      return {
        sort(sortObj: any) {
          return {
            async lean() {
              let docs: any[] = [];
              if (lineageModel) {
                try {
                  docs = await lineageModel.find(filter).sort(sortObj).lean();
                } catch (e: any) {
                  console.warn("[AI Studio] Error reading contactmessages from lineage:", e.message);
                }
              }
              if (docs.length === 0 && usersModel) {
                try {
                  docs = await usersModel.find(filter).sort(sortObj).lean();
                } catch (e: any) {
                  console.warn("[AI Studio] Error reading contactmessages from users:", e.message);
                }
              }
              if (docs.length === 0) {
                const inMemory = getInMemoryContactMessages();
                if (inMemory.length > 0) return [...inMemory];
              }
              return docs;
            },
          };
        },
      };
    },
    async findById(id: string) {
      if (lineageModel) {
        try {
          const doc = await lineageModel.findById(id);
          if (doc) return doc;
        } catch {}
      }
      if (usersModel) {
        try {
          const doc = await usersModel.findById(id);
          if (doc) return doc;
        } catch {}
      }
      const inMemory = getInMemoryContactMessages();
      const item = inMemory.find((m) => String(m._id) === String(id));
      if (!item) return null;
      return {
        ...item,
        async save() {
          item.updatedAt = new Date();
          return item;
        },
      };
    },
    async findByIdAndUpdate(id: string, update: any, options: any = { new: true }) {
      let res: any = null;
      if (lineageModel) {
        try {
          res = await lineageModel.findByIdAndUpdate(id, update, options);
        } catch {}
      }
      if (usersModel) {
        try {
          const uRes = await usersModel.findByIdAndUpdate(id, update, options);
          if (!res) res = uRes;
        } catch {}
      }
      if (!res) {
        const inMemory = getInMemoryContactMessages();
        const item = inMemory.find((m) => String(m._id) === String(id));
        if (item) {
          if (update.$set) Object.assign(item, update.$set);
          else Object.assign(item, update);
          item.updatedAt = new Date();
          return item;
        }
      }
      return res;
    },
    async findByIdAndDelete(id: string) {
      let res: any = null;
      const isValidObjectId = Types.ObjectId.isValid(id);
      const query = isValidObjectId
        ? { $or: [{ _id: id }, { _id: new Types.ObjectId(id) }] }
        : { _id: id };

      if (lineageModel) {
        try {
          const lRes = await lineageModel.findOneAndDelete(query);
          if (lRes) res = lRes;
        } catch (e: any) {
          console.warn("[AI Studio] Error deleting contact message from lineage:", e.message);
        }
      }
      if (usersModel) {
        try {
          const uRes = await usersModel.findOneAndDelete(query);
          if (uRes && !res) res = uRes;
        } catch (e: any) {
          console.warn("[AI Studio] Error deleting contact message from users:", e.message);
        }
      }
      const inMemory = getInMemoryContactMessages();
      const idx = inMemory.findIndex((m) => String(m._id) === String(id));
      if (idx !== -1) {
        const [removed] = inMemory.splice(idx, 1);
        if (!res) res = removed;
      }
      return res || { _id: id, deleted: true };
    },
  };
}

function buildSuggestEditModel(
  lineageConn: Connection,
  usersConn: Connection,
): any {
  const lineageModel =
    lineageConn && lineageConn.readyState === 1
      ? lineageConn.models.SuggestedEdit ||
        lineageConn.model<SuggestedEditDocument>(
          "SuggestedEdit",
          SuggestedEditSchema,
        )
      : null;

  const usersModel =
    usersConn && usersConn.readyState === 1
      ? usersConn.models.SuggestedEdit ||
        usersConn.model<SuggestedEditDocument>(
          "SuggestedEdit",
          SuggestedEditSchema,
        )
      : null;

  const primaryModel = lineageModel || usersModel;
  if (!primaryModel) {
    return buildFallbackSuggestEditModel();
  }

  return {
    modelName: "SuggestedEdit",
    async create(data: any) {
      let doc: any = null;
      if (lineageModel) {
        try {
          doc = await lineageModel.create(data);
        } catch (e: any) {
          console.warn("[AI Studio] Error creating suggested edit in lineage DB:", e.message);
        }
      }
      if (usersModel) {
        try {
          const docData = doc ? { ...data, _id: doc._id } : data;
          const uDoc = await usersModel.create(docData);
          if (!doc) doc = uDoc;
        } catch (e: any) {
          console.warn("[AI Studio] Error creating suggested edit in users DB:", e.message);
        }
      }
      if (!doc) {
        const fallback = buildFallbackSuggestEditModel();
        doc = await fallback.create(data);
      }
      const store = getInMemorySuggestEdits();
      store.set(String(doc._id), doc.toObject ? doc.toObject() : doc);
      return doc;
    },
    find(filter: any = {}) {
      return {
        sort(sortObj: any) {
          return {
            async lean() {
              if (lineageModel) {
                try {
                  const docs = await lineageModel.find(filter).sort(sortObj).lean();
                  return docs || [];
                } catch (e: any) {
                  console.warn("[AI Studio] Error querying suggested edits from lineage DB:", e.message);
                }
              }
              if (usersModel) {
                try {
                  const docs = await usersModel.find(filter).sort(sortObj).lean();
                  return docs || [];
                } catch (e: any) {
                  console.warn("[AI Studio] Error querying suggested edits from users DB:", e.message);
                }
              }
              const store = getInMemorySuggestEdits();
              let all = Array.from(store.values());
              if (filter?.status) {
                all = all.filter((e) => e.status === filter.status);
              }
              return all;
            },
          };
        },
      };
    },
    async findById(id: string) {
      const isValidObjectId = Types.ObjectId.isValid(id);
      const query = isValidObjectId
        ? { $or: [{ _id: id }, { _id: new Types.ObjectId(id) }] }
        : { _id: id };

      let doc: any = null;
      if (lineageModel) {
        try {
          doc = await lineageModel.findOne(query);
        } catch {}
      }
      if (!doc && usersModel) {
        try {
          doc = await usersModel.findOne(query);
        } catch {}
      }
      if (!doc) {
        const store = getInMemorySuggestEdits();
        const mem = store.get(id);
        if (mem) doc = { ...mem };
      }
      if (!doc) return null;

      // Ensure doc.save() syncs status across BOTH database connections and memory
      doc.save = async function () {
        const status = this.status;
        const updateObj = { status, updatedAt: new Date() };
        if (lineageModel) {
          try {
            await lineageModel.findOneAndUpdate(query, { $set: updateObj });
          } catch {}
        }
        if (usersModel) {
          try {
            await usersModel.findOneAndUpdate(query, { $set: updateObj });
          } catch {}
        }
        const store = getInMemorySuggestEdits();
        if (store.has(id)) {
          const existing = store.get(id);
          store.set(id, { ...existing, ...updateObj });
        }
        return this;
      };

      return doc;
    },
    async findByIdAndUpdate(id: string, update: any, options: any = { new: true }) {
      const isValidObjectId = Types.ObjectId.isValid(id);
      const query = isValidObjectId
        ? { $or: [{ _id: id }, { _id: new Types.ObjectId(id) }] }
        : { _id: id };

      const updateObj = update.$set ? update : { $set: update };
      if (!updateObj.$set.updatedAt) {
        updateObj.$set.updatedAt = new Date();
      }

      let res: any = null;
      if (lineageModel) {
        try {
          res = await lineageModel.findOneAndUpdate(query, updateObj, options);
        } catch (e: any) {
          console.warn("[AI Studio] Error updating suggested edit in lineage DB:", e.message);
        }
      }
      if (usersModel) {
        try {
          const uRes = await usersModel.findOneAndUpdate(query, updateObj, options);
          if (!res) res = uRes;
        } catch (e: any) {
          console.warn("[AI Studio] Error updating suggested edit in users DB:", e.message);
        }
      }
      const store = getInMemorySuggestEdits();
      if (store.has(id)) {
        const existing = store.get(id);
        const updated = { ...existing, ...(update.$set || update), updatedAt: new Date() };
        store.set(id, updated);
        if (!res) res = updated;
      }
      return res;
    },
  };
}

export async function getModelsAsync() {
  await Promise.allSettled([
    ensureConnection("lineage"),
    ensureConnection("users"),
  ]);
  return getModels();
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
      : (hasMongoLineage
          ? lineageConn.models.User ||
            lineageConn.model<UserDocument>("User", UserSchema)
          : buildFallbackUserModel()),
    ContactMessage:
      hasMongoLineage || hasMongoUsers
        ? buildContactModel(lineageConn, usersConn)
        : buildFallbackContactModel(),
    SuggestEdit:
      hasMongoLineage || hasMongoUsers
        ? buildSuggestEditModel(lineageConn, usersConn)
        : buildFallbackSuggestEditModel(),
  };
}

