import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RedisVectorStore } from '@langchain/redis';
import { createClient } from 'redis';
import { Embeddings } from '@langchain/core/embeddings';

// @ts-ignore
import { pipeline } from '@xenova/transformers';

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

let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisConnected = false;

export async function getRedisClient() {
  if (redisClient && isRedisConnected) return redisClient;
  
  const url = process.env.REDIS_URI || 'redis://localhost:6379';
  redisClient = createClient({ 
    url,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: false // fail fast if Redis is down
    }
  });

  redisClient.on('error', (err) => {
    console.warn('[Redis] Connection Error:', err.message);
    isRedisConnected = false;
  });

  try {
    await redisClient.connect();
    isRedisConnected = true;
    console.log('[Redis] Connected successfully to Vector Store.');
  } catch (err: any) {
    console.warn(`[Redis] Failed to connect to ${url}. Vector features will be mocked.`);
    isRedisConnected = false;
  }

  return redisClient;
}

export function getEmbeddingsModel() {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && !process.env.OPENAI_API_KEY.startsWith('sk-s0c')) {
    return new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });
  }
  return new LocalEmbeddings();
}

/**
 * Vectorizes a repository by chunking its source files and storing them in Redis.
 */
export async function vectorizeRepository(repositoryId: string, files: any[]) {
  const client = await getRedisClient();
  if (!isRedisConnected || !client) {
    console.log(`[RAG] Skipping vectorization for ${repositoryId} (Redis not available).`);
    return;
  }

  const embeddings = getEmbeddingsModel();

  // 1. Text Splitting
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docsToEmbed: any[] = [];
  
  for (const file of files) {
    if (!file.content) continue;
    // Skip very large files or non-source files if needed, but let's chunk them
    const chunks = await splitter.createDocuments(
      [file.content], 
      [{ 
        repositoryId,
        path: file.path, 
        loc: file.loc,
        extension: file.extension
      }]
    );
    docsToEmbed.push(...chunks);
  }

  if (docsToEmbed.length === 0) return;

  console.log(`[RAG] Pushing ${docsToEmbed.length} chunks to Redis for repo ${repositoryId}...`);
  
  // 2. Push to Redis Vector Store
  // We use repositoryId as the indexName so we can scope queries per repo
  try {
    await RedisVectorStore.fromDocuments(
      docsToEmbed,
      embeddings,
      {
        redisClient: client as any,
        indexName: `repo:${repositoryId}`,
      }
    );
    console.log(`[RAG] Successfully vectorized repository ${repositoryId}.`);
  } catch (e: any) {
    console.error(`[RAG] Failed to push vectors to Redis: ${e.message}`);
  }
}

/**
 * Retrieves relevant chunks for a specific query from Redis.
 */
export async function retrieveRelevantChunks(repositoryId: string, query: string, topK = 5): Promise<string> {
  const client = await getRedisClient();
  if (!isRedisConnected || !client) {
    return "MOCK_RAG_CONTEXT: Redis is not connected. Unable to retrieve actual source code.";
  }

  try {
    const embeddings = getEmbeddingsModel();
    const vectorStore = new RedisVectorStore(embeddings, {
      redisClient: client as any,
      indexName: `repo:${repositoryId}`,
    });

    const results = await vectorStore.similaritySearch(query, topK);
    
    if (results.length === 0) return "No relevant code snippets found.";

    return results.map(r => `--- File: ${r.metadata.path} ---\n${r.pageContent}\n`).join('\n\n');
  } catch (e: any) {
    console.error(`[RAG] Search failed: ${e.message}`);
    return `Error retrieving context: ${e.message}`;
  }
}
