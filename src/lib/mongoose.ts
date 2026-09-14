import mongoose from "mongoose";

// CRITICAL: fail fast, don't hang requests if MongoDB is offline
mongoose.set("bufferCommands", false);

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_URI_USERS = process.env.MONGODB_URI_USERS || MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
  isAvailable: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? {
  conn: null,
  promise: null,
  isAvailable: false,
};
global._mongoose = cached;

export async function dbConnect(): Promise<typeof mongoose | null> {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) {
    return null;
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      })
      .then((m) => {
        cached.isAvailable = true;
        return m;
      })
      .catch((err) => {
        console.warn("[AI Studio] MongoDB not connected — fallback active:", err.message);
        cached.isAvailable = false;
        return null;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export async function userDBConnect(): Promise<typeof mongoose | null> {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI_USERS) {
    return null;
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI_USERS, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      })
      .then((m) => {
        cached.isAvailable = true;
        return m;
      })
      .catch((err) => {
        console.warn("[AI Studio] User MongoDB not connected — fallback active:", err.message);
        cached.isAvailable = false;
        return null;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export function isMongoAvailable(): boolean {
  return cached.isAvailable && mongoose.connection.readyState === 1;
}
