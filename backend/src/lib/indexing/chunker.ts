/**
 * indexing/chunker.ts — Smart chunking for the vector store
 * 
 * Creates three types of chunks, each with rich metadata:
 *   1. code      — Raw source code split into overlapping segments
 *   2. file_summary — AI-generated file summary (one chunk per file)
 *   3. repo_summary — Repository-level summary sections
 * 
 * The metadata tags allow the retriever to filter by chunk type.
 */

import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ParsedFileInfo } from './parser';
import { FileSummary, RepoSummary } from './summarizer';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChunkMetadata {
  repositoryId: string;
  type: 'code' | 'file_summary' | 'repo_summary';
  path?: string;
  extension?: string;
  keywords?: string[];
  section?: string; // For repo_summary chunks
  symbol?: string;
  symbolType?: string;
  parentSymbol?: string;
  startLine?: number;
  endLine?: number;
}

// ─── Code Chunking ───────────────────────────────────────────────────────────

const codeSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 450,
  chunkOverlap: 80,
});

/**
 * AST-Aware Code Chunking:
 * Creates one chunk per AST symbol (function, class, component, hook, method, exported_const).
 * Falls back to character chunking if AST parsing failed or returned 0 symbols.
 */
export async function chunkCodeAST(
  repositoryId: string,
  filePath: string,
  content: string,
  parsed: ParsedFileInfo
): Promise<Document[]> {
  if (!content || content.trim().length === 0) return [];

  // Fallback to character chunking if no symbols were extracted
  if (!parsed.symbols || parsed.symbols.length === 0) {
    return chunkCode(repositoryId, filePath, content, parsed);
  }

  const docs: Document[] = [];
  const ext = filePath.split('.').pop() || '';

  for (const sym of parsed.symbols) {
    const header = `// File: ${filePath}\n// Symbol: ${sym.name} (${sym.type})${sym.parentSymbol ? ` [Parent: ${sym.parentSymbol}]` : ''} [Lines ${sym.startLine}-${sym.endLine}]\n`;
    const fullText = header + sym.code;

    const metadata: ChunkMetadata = {
      repositoryId,
      type: 'code',
      path: filePath,
      extension: ext,
      symbol: sym.name,
      symbolType: sym.type,
      parentSymbol: sym.parentSymbol || '',
      startLine: sym.startLine,
      endLine: sym.endLine,
      keywords: [sym.name, sym.type, ...(sym.parentSymbol ? [sym.parentSymbol] : [])],
    };

    // Ensure chunk remains under embedding model's preferred size (~1200 chars max)
    if (fullText.length > 1200) {
      const splitDocs = await codeSplitter.createDocuments([fullText], [metadata]);
      docs.push(...splitDocs);
    } else {
      docs.push(new Document({ pageContent: fullText, metadata: metadata as any }));
    }
  }

  return docs;
}

/**
 * Chunk raw source code into overlapping segments.
 * Each chunk carries metadata about which file, functions, and components it contains.
 */
export async function chunkCode(
  repositoryId: string,
  filePath: string,
  content: string,
  parsed: ParsedFileInfo
): Promise<Document[]> {
  if (!content || content.trim().length === 0) return [];

  const metadataBase: ChunkMetadata = {
    repositoryId,
    type: 'code',
    path: filePath,
    extension: filePath.split('.').pop() || '',
    keywords: [
      ...parsed.functions.slice(0, 5),
      ...parsed.components.slice(0, 3),
      ...parsed.classes.slice(0, 3),
    ],
  };

  const docs = await codeSplitter.createDocuments(
    [content],
    [metadataBase]
  );

  return docs;
}

// ─── Summary Chunking ────────────────────────────────────────────────────────

/**
 * Create a single chunk from a file summary.
 * This allows the retriever to find summaries directly via semantic search.
 */
export function chunkFileSummary(
  repositoryId: string,
  summary: FileSummary
): Document {
  const text = [
    `File: ${summary.path}`,
    `Purpose: ${summary.purpose}`,
    `Summary: ${summary.summary}`,
    summary.authUsage !== 'None' ? `Authentication: ${summary.authUsage}` : '',
    summary.dbUsage !== 'None' ? `Database: ${summary.dbUsage}` : '',
    summary.apiUsage !== 'None' ? `API: ${summary.apiUsage}` : '',
    summary.technologies.length > 0 ? `Technologies: ${summary.technologies.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return new Document({
    pageContent: text,
    metadata: {
      repositoryId,
      type: 'file_summary',
      path: summary.path,
      keywords: summary.keywords,
    } as ChunkMetadata,
  });
}

/**
 * Create chunks from the repository-level summary.
 * Split into logical sections so each section can be retrieved independently.
 */
export function chunkRepoSummary(
  repositoryId: string,
  summary: RepoSummary
): Document[] {
  const docs: Document[] = [];

  const addSection = (section: string, content: string) => {
    if (!content || content === 'None detected' || content === 'Could not determine — LLM unavailable.') return;
    docs.push(new Document({
      pageContent: `[Repository Summary — ${section}]\n${content}`,
      metadata: {
        repositoryId,
        type: 'repo_summary',
        section,
      } as ChunkMetadata,
    }));
  };

  addSection('Overview', summary.projectOverview);
  addSection('Tech Stack', summary.techStack.join(', '));
  addSection('Architecture', summary.architecture);
  addSection('Authentication Flow', summary.authFlow);
  addSection('Database Flow', summary.dbFlow);
  addSection('API Flow', summary.apiFlow);

  // Folder responsibilities as one chunk
  const folderText = Object.entries(summary.folderResponsibilities)
    .map(([folder, desc]) => `${folder}: ${desc}`)
    .join('\n');
  if (folderText) addSection('Folder Responsibilities', folderText);

  // Important files as one chunk
  const importantText = summary.importantFiles
    .map(f => `${f.path}: ${f.reason}`)
    .join('\n');
  if (importantText) addSection('Important Files', importantText);

  return docs;
}
