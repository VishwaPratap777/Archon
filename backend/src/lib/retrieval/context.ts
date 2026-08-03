/**
 * retrieval/context.ts — Context assembly for the LLM
 * 
 * Combines the repository summary, reranked code chunks, and file summaries
 * into a single structured context string that the LLM receives alongside
 * the user's question.
 */

import { Document } from '@langchain/core/documents';
import { Db, ObjectId } from 'mongodb';
import { connectToDatabase } from '../db';
import { RepoSummary } from '../indexing/summarizer';

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Assemble the final context string for the LLM.
 * Includes: repo summary (always) + reranked chunks (grouped by type).
 */
export async function assembleContext(
  repoId: string,
  rankedDocuments: Document[]
): Promise<string> {
  const { db } = await connectToDatabase();
  const repoObjectId = new ObjectId(repoId);

  // Always include the repository summary (it's small and high-value)
  const repo = await db.collection('repositories').findOne({ _id: repoObjectId });
  const repoSummary: RepoSummary | null = repo?.repoSummary || null;

  const sections: string[] = [];

  // ── Section 1: Repository Overview ──
  if (repoSummary) {
    sections.push(`=== REPOSITORY OVERVIEW ===
Project: ${repo?.name || 'Unknown'}
${repoSummary.projectOverview}
Tech Stack: ${repoSummary.techStack?.join(', ') || 'Unknown'}
Architecture: ${repoSummary.architecture || 'Unknown'}
Authentication: ${repoSummary.authFlow || 'None detected'}
Database: ${repoSummary.dbFlow || 'None detected'}
API: ${repoSummary.apiFlow || 'None detected'}`);
  }

  // ── Section 2: File Summaries from retrieved chunks ──
  const summaryChunks = rankedDocuments.filter(d => d.metadata?.type === 'file_summary');
  if (summaryChunks.length > 0) {
    const summaryText = summaryChunks
      .map(d => d.pageContent)
      .join('\n\n');
    sections.push(`=== RELEVANT FILE SUMMARIES ===\n${summaryText}`);
  }

  // ── Section 3: Source code from retrieved chunks ──
  const codeChunks = rankedDocuments.filter(d => d.metadata?.type === 'code').slice(0, 4);
  if (codeChunks.length > 0) {
    const codeText = codeChunks
      .map(d => {
        const filePath = d.metadata?.path || 'unknown';
        const content = d.pageContent.length > 500 ? d.pageContent.slice(0, 500) + '\n...[truncated]' : d.pageContent;
        return `--- ${filePath} ---\n${content}`;
      })
      .join('\n\n');
    sections.push(`=== RELEVANT SOURCE CODE ===\n${codeText}`);
  }

  // ── Section 4: Repo summary chunks (architecture, auth flow, etc.) ──
  const repoChunks = rankedDocuments.filter(d => d.metadata?.type === 'repo_summary');
  if (repoChunks.length > 0) {
    const repoText = repoChunks.map(d => d.pageContent).join('\n\n');
    sections.push(`=== REPOSITORY ANALYSIS ===\n${repoText}`);
  }

  if (sections.length === 0) {
    return 'No relevant context was found for this repository. The index may be empty or the query did not match any stored content.';
  }

  return sections.join('\n\n');
}
