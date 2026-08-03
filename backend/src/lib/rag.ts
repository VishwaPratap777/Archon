import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RedisVectorStore } from '@langchain/redis';
import { createClient } from 'redis';
import { Embeddings } from '@langchain/core/embeddings';

// Mock Embeddings for fallback when API key is missing
class MockEmbeddings extends Embeddings {
  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map(() => Array(1536).fill(0.1));
  }
  async embedQuery(text: string): Promise<number[]> {
    return Array(1536).fill(0.1);
  }
}

let redisClient: ReturnType<typeof createClient> | null = null;
let isRedisConnected = false;

export async function getRedisClient() {
  if (redisClient && isRedisConnected) return redisClient;
  
  const url = process.env.REDIS_URI || 'redis://localhost:6379';
  redisClient = createClient({ url });

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
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });
  }
  console.warn('[RAG] OPENAI_API_KEY not found. Falling back to Mock Embeddings.');
  return new MockEmbeddings({ maxRetries: 0 });
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
