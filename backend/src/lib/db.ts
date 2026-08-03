import { MongoClient, Db, ObjectId } from 'mongodb';

// --- In-Memory Mock Database Fallback ---
class MockCollection {
  name: string;
  data: any[] = [];

  constructor(name: string) {
    this.name = name;
  }

  find(query: any = {}) {
    let results = this.data.filter(item => {
      for (const key in query) {
        let val = query[key];
        if (val instanceof ObjectId) {
          if (!item[key] || item[key].toString() !== val.toString()) return false;
        } else if (typeof val === 'object' && val !== null) {
          if (val.$in && Array.isArray(val.$in)) {
            const itemValStr = String(item[key]);
            if (!val.$in.map(String).includes(itemValStr)) return false;
          }
        } else {
          if (String(item[key]) !== String(val)) return false;
        }
      }
      return true;
    });

    const cursor = {
      sort: (sortSpec: any) => {
        const key = Object.keys(sortSpec)[0];
        const dir = sortSpec[key]; // 1 or -1
        results.sort((a, b) => {
          if (a[key] < b[key]) return dir;
          if (a[key] > b[key]) return -dir;
          return 0;
        });
        return cursor;
      },
      toArray: async () => {
        return results;
      }
    };
    return cursor;
  }

  async findOne(query: any = {}) {
    const results = await this.find(query).toArray();
    return results[0] || null;
  }

  async insertOne(doc: any) {
    const newDoc = { ...doc };
    if (!newDoc._id) {
      newDoc._id = new ObjectId();
    }
    this.data.push(newDoc);
    return { insertedId: newDoc._id, acknowledged: true };
  }

  async insertMany(docs: any[]) {
    const insertedIds: Record<number, ObjectId> = {};
    const newDocs = docs.map((doc, idx) => {
      const newDoc = { ...doc };
      if (!newDoc._id) {
        newDoc._id = new ObjectId();
      }
      insertedIds[idx] = newDoc._id;
      return newDoc;
    });
    this.data.push(...newDocs);
    return { insertedIds, acknowledged: true };
  }

  async updateOne(query: any, update: any, options: any = {}) {
    let item = await this.findOne(query);
    if (!item && options.upsert) {
      item = { ...query };
      if (!item._id) item._id = new ObjectId();
      this.data.push(item);
    }
    if (item) {
      if (update.$set) {
        for (const key in update.$set) {
          if (key.includes('.')) {
            const parts = key.split('.');
            let curr = item;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') {
                curr[parts[i]] = {};
              }
              curr = curr[parts[i]];
            }
            curr[parts[parts.length - 1]] = update.$set[key];
          } else {
            item[key] = update.$set[key];
          }
        }
      }
      if (update.$inc) {
        for (const key in update.$inc) {
          const incVal = Number(update.$inc[key]) || 0;
          if (key.includes('.')) {
            const parts = key.split('.');
            let curr = item;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!curr[parts[i]] || typeof curr[parts[i]] !== 'object') {
                curr[parts[i]] = {};
              }
              curr = curr[parts[i]];
            }
            const lastKey = parts[parts.length - 1];
            curr[lastKey] = (Number(curr[lastKey]) || 0) + incVal;
          } else {
            item[key] = (Number(item[key]) || 0) + incVal;
          }
        }
      }
      if (update.$push) {
        for (const key in update.$push) {
          if (!Array.isArray(item[key])) {
            item[key] = [];
          }
          item[key].push(update.$push[key]);
        }
      }
    }
    return { modifiedCount: item ? 1 : 0, matchedCount: item ? 1 : 0 };
  }

  async deleteMany(query: any = {}) {
    const initialCount = this.data.length;
    this.data = this.data.filter(item => {
      for (const key in query) {
        if (String(item[key]) !== String(query[key])) return true;
      }
      return false;
    });
    return { deletedCount: initialCount - this.data.length };
  }

  async countDocuments(query: any = {}) {
    const results = await this.find(query).toArray();
    return results.length;
  }

  async bulkWrite(operations: any[]) {
    for (const op of operations) {
      if (op.updateOne) {
        await this.updateOne(op.updateOne.filter, op.updateOne.update, { upsert: op.updateOne.upsert });
      } else if (op.insertOne) {
        await this.insertOne(op.insertOne.document);
      } else if (op.deleteMany) {
        await this.deleteMany(op.deleteMany.filter);
      }
    }
    return { ok: 1 };
  }
}

class MockDb {
  collections: Record<string, MockCollection> = {};

  collection(name: string) {
    if (!this.collections[name]) {
      this.collections[name] = new MockCollection(name);
    }
    return this.collections[name];
  }
}
// ----------------------------------------

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
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/archon';
    const opts = {
      serverSelectionTimeoutMS: 4000, // Fail fast (4 seconds) to trigger in-memory fallback
    };
    
    console.log(`[DB] Attempting connection to MongoDB...`);
    cached.promise = MongoClient.connect(MONGODB_URI, opts)
      .then((client) => {
        console.log("[DB] Connected to MongoDB database successfully.");
        return {
          client,
          db: client.db(),
        };
      })
      .catch((err) => {
        console.warn(`[DB] MongoDB connection failed: ${err.message || err}`);
        console.warn("[DB] Outbound connection blocked or database offline. Falling back to In-Memory Mock Database.");
        
        const mockDb = new MockDb();
        const mockClient = {
          close: async () => {},
          db: () => mockDb,
        };

        return {
          client: mockClient as any,
          db: mockDb as any,
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
