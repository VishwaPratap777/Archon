/**
 * retrieval/reranker.ts — Token-Free Hybrid Reranker
 * 
 * Reranks candidate chunks using metadata matching, path relevance,
 * and keyword overlap. Uses 0 LLM tokens and executes in <1ms.
 */

import { Document } from '@langchain/core/documents';

export interface RankedDocument {
  document: Document;
  score: number;
}

/**
 * Rerank documents based on metadata relevance, file path matching, and keyword overlap.
 * Returns the top `topK` results sorted by relevance score.
 */
export async function rerank(
  query: string,
  documents: Document[],
  topK: number = 4
): Promise<Document[]> {
  if (documents.length === 0) return [];
  if (documents.length <= topK) return documents;

  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3);

  const ranked: RankedDocument[] = documents.map((doc, index) => {
    let score = 0;
    const path = (doc.metadata?.path || '').toLowerCase();
    const content = doc.pageContent.toLowerCase();
    const keywords: string[] = doc.metadata?.keywords || [];

    // 1. Initial position score (higher similarity search rank gets base points)
    score += (documents.length - index) * 2;

    // 2. Keyword overlap in content
    for (const term of queryTerms) {
      if (content.includes(term)) {
        score += 5;
      }
      // Path match bonus (file path matches query term, e.g. "auth" matching "src/auth.ts")
      if (path.includes(term)) {
        score += 15;
      }
      // AST function/class keyword bonus
      if (keywords.some(k => k.toLowerCase().includes(term))) {
        score += 10;
      }
    }

    // 3. Chunk type preference
    if (doc.metadata?.type === 'file_summary') {
      score += 3;
    }

    return { document: doc, score };
  });

  ranked.sort((a, b) => b.score - a.score);

  return ranked.slice(0, topK).map(r => r.document);
}
