/**
 * retrieval/retriever.ts — Hybrid search (vector + metadata filtering)
 * 
 * Combines semantic vector search with chunk-type filtering
 * to return the most relevant documents for a query.
 */

import { Document } from '@langchain/core/documents';
import * as vectorStore from '../vectorstore';
import { UnderstandingResult } from './query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetrievalResult {
  documents: Document[];
  totalRetrieved: number;
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Retrieve relevant documents using hybrid search.
 * 
 * 1. Vector search with the expanded query (semantic similarity)
 * 2. Filter by preferred chunk types based on query category
 * 3. Deduplicate and return
 */
export async function retrieve(
  repoId: string,
  understanding: UnderstandingResult
): Promise<RetrievalResult> {
  // Pull candidate pool for reranking
  const topK = 8;

  const results = await vectorStore.search(repoId, understanding.expandedQuery, topK);

  if (results.length === 0) {
    return { documents: [], totalRetrieved: 0 };
  }

  // Filter by preferred chunk types
  const preferred = understanding.searchFilters.preferredChunkTypes;
  const filtered = results.filter(doc => {
    const type = doc.metadata?.type;
    return preferred.includes(type);
  });

  // If filtering removed too many results, fall back to unfiltered
  const finalDocs = filtered.length >= 2 ? filtered : results;

  // Deduplicate by content hash
  const seen = new Set<string>();
  const deduped = finalDocs.filter(doc => {
    const key = doc.pageContent.slice(0, 150);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    documents: deduped.slice(0, 6),
    totalRetrieved: results.length,
  };
}
