import mongoose, { Connection } from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _dbConnections: Map<string, Connection> | undefined;
  // eslint-disable-next-line no-var
  var _dbConnectionPromises: Map<string, Promise<Connection>> | undefined;
}

const connections = global._dbConnections || new Map<string, Connection>();
global._dbConnections = connections;

const connectionPromises =
  global._dbConnectionPromises || new Map<string, Promise<Connection>>();
global._dbConnectionPromises = connectionPromises;

export function uriFor(dbKey: string): string {
  const envKey = `MONGODB_URI_${dbKey.toUpperCase()}`;
  return process.env[envKey] || process.env.MONGODB_URI || "";
}

export function getConnection(dbKey: string = "default"): Connection {
  let conn = connections.get(dbKey);
  if (!conn) {
    const uri = uriFor(dbKey);
    if (uri) {
      conn = mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
    } else {
      // Return a connection object without connecting to an external server
      conn = mongoose.createConnection();
    }
    connections.set(dbKey, conn);
  }
  return conn;
}

export async function ensureConnection(
  dbKey: string = "default",
): Promise<Connection> {
  const conn = getConnection(dbKey);
  if (conn.readyState === 1) return conn;

  const uri = uriFor(dbKey);
  if (!uri) return conn;

  if (connectionPromises.has(dbKey)) {
    try {
      await connectionPromises.get(dbKey);
      return conn;
    } catch {
      // Continue to retry if previous failed
    }
  }

  const p = (async () => {
    try {
      if (conn.readyState !== 1) {
        await conn.asPromise();
      }
      return conn;
    } catch (err: any) {
      console.warn(`[AI Studio] MongoDB connection for '${dbKey}' failed:`, err.message);
      return conn;
    }
  })();

  connectionPromises.set(dbKey, p);
  return await p;
}
