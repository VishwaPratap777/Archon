import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/archon';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface GlobalMongo {
  conn: { client: MongoClient; db: Db } | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongo: GlobalMongo;
}

let cached = global.mongo;

if (!cached) {
  cached = global.mongo = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {};
    cached.promise = MongoClient.connect(MONGODB_URI, opts).then((client) => {
      return {
        client,
        db: client.db(),
      };
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function getSettings() {
  try {
    const { db } = await connectToDatabase();
    const settings = await db.collection('settings').findOne({});
    return settings || {};
  } catch (error) {
    console.error('Failed to get settings from database:', error);
    return {};
  }
}
