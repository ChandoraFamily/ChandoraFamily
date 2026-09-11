import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_URI_USERS = process.env.MONGODB_URI_USERS;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable.");
}

// Next.js hot-reloads modules in dev, which would otherwise open a new
// connection on every request. Cache the connection on the global object
// so it's reused across reloads.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export async function userDBConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI_USERS as string);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
