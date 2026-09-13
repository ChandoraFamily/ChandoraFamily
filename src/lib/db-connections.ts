import mongoose, { Connection } from "mongoose";

// Maps a logical "database key" to its own MongoDB connection, so different
// parts of the app can live in different databases/clusters — e.g. family
// data in one DB, accounts in another, or a separate DB per organization.
const connections = new Map<string, Connection>();

function uriFor(dbKey: string): string {
  const envKey = `MONGODB_URI_${dbKey.toUpperCase()}`;
  return process.env[envKey] || process.env.MONGODB_URI! || "";
}

export function getConnection(dbKey: string = "default"): Connection {
  let conn = connections.get(dbKey);
  if (!conn) {
    const uri = uriFor(dbKey);
    if (uri) {
      conn = mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      });
    } else {
      conn = mongoose.createConnection();
    }
    connections.set(dbKey, conn);
  }
  return conn;
}
