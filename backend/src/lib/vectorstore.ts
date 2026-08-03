/**
 * vectorstore.ts — Clean abstraction over the Redis vector store
 * 
 * Wraps @langchain/redis RedisVectorStore behind a simple interface.
 * Swapping to Pinecone/Qdrant/Chroma later requires changing only this file.
 */

import { RedisVectorStore } from '@langchain/redis';
import { createClient } from 'redis';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';

// @ts-ignore
import { pipeline } from '@xenova/transformers';

// ─── Local Embedding Model (CPU, no API key needed) ─────────────────────────

class LocalEmbeddings extends Embeddings {
  private extractor: any = null;

  constructor(params?: any) {
    super(params ?? {});
  }

  async init() {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    await this.init();
    const results: number[][] = [];
    for (const text of texts) {
      const output = await this.extractor(text, { pooling: 'mean', normalize: true });
      results.push(Array.from(output.data) as number[]);
    }
    return results;
  }

  async embedQuery(text: string): Promise<number[]> {
    await this.init();
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
  }
}

// ─── Redis Connection ────────────────────────────────────────────────────────

let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisConnected = false;

async function getRedisClient() {
  if (redisClient && isRedisConnected) return redisClient;

  const url = process.env.REDIS_URI || 'redis://localhost:6379';
  redisClient = createClient({
    url,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: false,
    },
  });

  redisClient.on('error', (err) => {
    console.warn('[VectorStore] Redis error:', err.message);
    isRedisConnected = false;
  });

  try {
    await redisClient.connect();
    isRedisConnected = true;
    console.log('[VectorStore] Connected to Redis.');
  } catch (err: any) {
    console.warn(`[VectorStore] Redis connection failed: ${err.message}`);
    isRedisConnected = false;
  }

  return redisClient;
}

// ─── Embedding Model Selection ───────────────────────────────────────────────

function getEmbeddingsModel(): Embeddings {
  const key = process.env.OPENAI_API_KEY;
  if (key && key.startsWith('sk-')) {
    return new OpenAIEmbeddings({ openAIApiKey: key, modelName: 'text-embedding-3-small' });
  }
  return new LocalEmbeddings();
}

// ─── VectorStore Interface ───────────────────────────────────────────────────

/**
 * Store documents with embeddings for a specific repository.
 */
export async function addDocuments(
  repoId: string,
  documents: Document[]
): Promise<void> {
  const client = await getRedisClient();
  if (!isRedisConnected || !client) {
    console.warn(`[VectorStore] Skipping storage for ${repoId} — Redis not available.`);
    return;
  }

  if (documents.length === 0) return;

  const embeddings = getEmbeddingsModel();

  try {
    await RedisVectorStore.fromDocuments(documents, embeddings, {
      redisClient: client as any,
      indexName: `repo:${repoId}`,
    });
    console.log(`[VectorStore] Stored ${documents.length} chunks for repo ${repoId}.`);
  } catch (e: any) {
    console.error(`[VectorStore] Failed to store vectors: ${e.message}`);
  }
}

/**
 * Search for the most relevant documents given a query.
 */
export async function search(
  repoId: string,
  query: string,
  topK: number = 10
): Promise<Document[]> {
  const client = await getRedisClient();
  if (!isRedisConnected || !client) {
    return [];
  }

  try {
    const embeddings = getEmbeddingsModel();
    const store = new RedisVectorStore(embeddings, {
      redisClient: client as any,
      indexName: `repo:${repoId}`,
    });

    return await store.similaritySearch(query, topK);
  } catch (e: any) {
    console.error(`[VectorStore] Search failed: ${e.message}`);
    return [];
  }
}

/**
 * Delete all stored vectors for a repository.
 */
export async function deleteRepository(repoId: string): Promise<void> {
  const client = await getRedisClient();
  if (!isRedisConnected || !client) return;

  try {
    // Drop the Redis index and its associated documents for this repo
    await client.ft.dropIndex(`repo:${repoId}`, { DD: true } as any);
    console.log(`[VectorStore] Deleted index and documents for repo ${repoId}.`);
  } catch (e: any) {
    // Ignore error if index doesn't exist
  }
}

/**
 * Check if vectors already exist for a repository.
 */
export async function hasIndex(repoId: string): Promise<boolean> {
  const client = await getRedisClient();
  if (!isRedisConnected || !client) return false;

  try {
    const info = await client.ft.info(`repo:${repoId}`);
    return (info as any).numDocs > 0;
  } catch {
    return false;
  }
}

/**
 * Delete vectors associated with specific file paths (for incremental updates).
 */
export async function deleteDocumentsByFilePaths(
  repoId: string,
  filePaths: string[]
): Promise<void> {
  const client = await getRedisClient();
  if (!isRedisConnected || !client || filePaths.length === 0) return;

  try {
    const pathSet = new Set(filePaths);
    const keys = await client.keys(`doc:repo:${repoId}:*`);
    const keysToDelete: string[] = [];

    for (const key of keys) {
      const docPath = await client.hGet(key, 'path');
      if (docPath && pathSet.has(docPath)) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      await client.del(keysToDelete);
      console.log(`[VectorStore] Deleted ${keysToDelete.length} obsolete vector chunks for ${filePaths.length} modified/removed files.`);
    }
  } catch (e: any) {
    console.warn(`[VectorStore] Failed to delete target vectors: ${e.message}`);
  }
}
