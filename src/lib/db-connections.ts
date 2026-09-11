import mongoose, { Connection } from "mongoose";

// Maps a logical "database key" to its own MongoDB connection, so different
// parts of the app can live in different databases/clusters — e.g. family
// data in one DB, accounts in another, or a separate DB per organization.
const connections = new Map<string, Connection>();

function uriFor(dbKey: string): string {
  const envKey = `MONGODB_URI_${dbKey.toUpperCase()}`;
  return process.env[envKey] || process.env.MONGODB_URI!;
}

export function getConnection(dbKey: string = "default"): Connection {
  let conn = connections.get(dbKey);
  if (!conn) {
    conn = mongoose.createConnection(uriFor(dbKey));
    connections.set(dbKey, conn);
  }
  return conn;
}
