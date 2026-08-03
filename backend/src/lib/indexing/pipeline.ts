/**
 * indexing/pipeline.ts — Full indexing pipeline orchestrator
 * 
 * Orchestrates the complete flow:
 *   Clone → Walk → Parse → Summarize → Chunk → Embed → Store → Cleanup
 * 
 * Supports commit hash caching to skip re-indexing unchanged repositories.
 * Reports progress via a callback for real-time UI updates.
 */

import { ObjectId, Db } from 'mongodb';
import { Document } from '@langchain/core/documents';
import { connectToDatabase, getSettings } from '../db';
import { cloneRepository, walkRepository, getHeadCommitHash, cleanupRepoFolder, FileEntry, parseGitCommits } from './git';
import { parseSourceFile, ParsedFileInfo } from './parser';
import { summarizeFile, summarizeFolder, summarizeRepository, FileSummary, FolderSummary, RepoSummary } from './summarizer';
import { chunkCodeAST, chunkFileSummary, chunkRepoSummary } from './chunker';
import * as vectorStore from '../vectorstore';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProgressCallback = (message: string, status: string, progress: number) => Promise<void>;

export interface IncrementalMetrics {
  hits: number;
  misses: number;
  deleted: number;
  reindexed: number;
  totalFiles: number;
  durationMs: number;
  cacheHitRatio: string;
}

export interface IndexingResult {
  success: boolean;
  fileCount: number;
  chunkCount: number;
  commitHash: string;
  cached: boolean;
  metrics?: IncrementalMetrics;
}

// ─── Source Extensions ───────────────────────────────────────────────────────

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go']);

// ─── Pipeline ────────────────────────────────────────────────────────────────

/**
 * Run the incremental, AST-aware indexing pipeline for a repository.
 */
export async function runIndexingPipeline(
  repoId: string,
  githubUrl: string,
  onProgress: ProgressCallback,
  userId?: string
): Promise<IndexingResult> {
  const startTime = Date.now();
  const { db } = await connectToDatabase();
  const repoObjectId = new ObjectId(repoId);
  let repoFolder = '';

  try {
    // ── Step 1: Check commit cache ──────────────────────────────────────────
    const existingRepo = await db.collection('repositories').findOne({ _id: repoObjectId });
    const existingHash = existingRepo?.commitHash || '';

    // ── Step 2: Clone ────────────────────────────────────────────────────
    await onProgress('Cloning repository...', 'cloning', 5);
    const settings: any = await getSettings();
    const cloneResult = await cloneRepository(githubUrl, settings.githubPat);
    repoFolder = cloneResult.repoPath;

    // ── Step 3: Get commit hash ──────────────────────────────────────────
    const commitHash = getHeadCommitHash(repoFolder);

    if (existingHash && existingHash === commitHash) {
      await onProgress('Repository unchanged — using cached index.', 'completed', 100);
      cleanupRepoFolder(repoFolder);
      return { success: true, fileCount: 0, chunkCount: 0, commitHash, cached: true };
    }

    // ── Step 4: Scan repository & Diff file hashes ─────────────────────
    await onProgress('Scanning repository files & computing SHA-256 hashes...', 'scanning', 10);
    const files = walkRepository(repoFolder);
    console.log(`[Pipeline] Found ${files.length} current files.`);

    // Fetch existing files from MongoDB to perform incremental diffing
    const existingDocs = await db.collection('files').find({ repositoryId: repoObjectId }).toArray();
    const existingFileMap = new Map<string, any>(existingDocs.map(f => [f.path, f]));
    const currentPathSet = new Set(files.map(f => f.path));

    const unchangedFiles = files.filter(f => existingFileMap.has(f.path) && existingFileMap.get(f.path).hash === f.hash);
    const modifiedFiles = files.filter(f => existingFileMap.has(f.path) && existingFileMap.get(f.path).hash !== f.hash);
    const addedFiles = files.filter(f => !existingFileMap.has(f.path));
    const removedFiles = existingDocs.filter(f => !currentPathSet.has(f.path));

    const hits = unchangedFiles.length;
    const misses = modifiedFiles.length + addedFiles.length;
    const deleted = removedFiles.length;
    const cacheHitRatio = files.length > 0 ? `${((hits / files.length) * 100).toFixed(1)}%` : '100%';

    console.log(`[Incremental Indexing] ${hits} Hits (unchanged), ${misses} Misses (modified/added), ${deleted} Deleted.`);

    // Detect frameworks from package.json
    const frameworks = detectFrameworks(files);

    const isFirstIndexing = existingDocs.length === 0;
    const filesToProcess = isFirstIndexing ? files : [...modifiedFiles, ...addedFiles];

    // ── Step 5: Clean up vectors for modified and removed files ──────────
    if (!isFirstIndexing) {
      const pathsToDelete = [...modifiedFiles.map(f => f.path), ...removedFiles.map(f => f.path)];
      if (pathsToDelete.length > 0) {
        await onProgress(`Deleting vectors for ${pathsToDelete.length} modified/removed files...`, 'indexing', 15);
        await vectorStore.deleteDocumentsByFilePaths(repoId, pathsToDelete);
        await db.collection('files').deleteMany({ repositoryId: repoObjectId, path: { $in: pathsToDelete } });
      }
    } else {
      await vectorStore.deleteRepository(repoId);
    }

    // ── Step 6: Parse AST for updated files ─────────────────────────────
    await onProgress(`AST Parsing ${filesToProcess.length} target files...`, 'parsing', 20);
    const parsedFiles: { file: FileEntry; parsed: ParsedFileInfo }[] = [];

    for (const file of filesToProcess) {
      const isSource = SOURCE_EXTENSIONS.has(file.extension);
      const parsed = isSource
        ? await parseSourceFile(file.content, file.extension)
        : emptyParsedInfo();
      parsedFiles.push({ file, parsed });
    }

    // ── Step 7: Generate file summaries ──────────────────────────────────
    await onProgress(`Summarizing ${filesToProcess.length} target files...`, 'summarizing', 35);
    const fileSummaries: FileSummary[] = [];

    // Store/update file docs in MongoDB with SHA-256 hash
    const fileDocs = parsedFiles.map(({ file, parsed }) => ({
      repositoryId: repoObjectId,
      path: file.path,
      hash: file.hash,
      content: file.content.slice(0, 100000),
      sizeBytes: file.sizeBytes,
      loc: file.loc,
      extension: file.extension,
      complexity: parsed.complexity,
      imports: parsed.imports,
      functionsCount: parsed.functions.length,
      classesCount: parsed.classes.length,
      symbolsCount: parsed.symbols.length,
      createdAt: new Date(),
    }));

    if (fileDocs.length > 0) {
      for (const doc of fileDocs) {
        await db.collection('files').updateOne(
          { repositoryId: repoObjectId, path: doc.path },
          { $set: doc },
          { upsert: true }
        );
      }
    }

    // Process file summaries in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < parsedFiles.length; i += BATCH_SIZE) {
      const batch = parsedFiles.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(({ file, parsed }) => summarizeFile(file.path, file.content, parsed, { userId, repositoryId: repoId }))
      );
      fileSummaries.push(...batchResults);

      const pct = 35 + Math.round((i / Math.max(parsedFiles.length, 1)) * 20);
      await onProgress(`Summarized ${Math.min(i + BATCH_SIZE, parsedFiles.length)}/${parsedFiles.length} files...`, 'summarizing', pct);
    }

    // ── Step 8: Generate folder & repository summaries ─────────────────
    await onProgress('Generating folder & repository summaries...', 'summarizing', 60);
    const folderSummaries = await generateFolderSummaries(fileSummaries);
    const repoSummary = await summarizeRepository(
      cloneResult.repoName,
      folderSummaries,
      fileSummaries,
      frameworks,
      { userId, repositoryId: repoId }
    );

    // ── Step 9: Chunk using AST-Aware Chunker ──────────────────────────
    await onProgress('Creating AST-aware code & summary chunks...', 'chunking', 70);
    const newChunks: Document[] = [];

    // AST-aware code chunks for modified/added files
    for (const { file, parsed } of parsedFiles) {
      if (SOURCE_EXTENSIONS.has(file.extension) && file.content.trim().length > 0) {
        const chunks = await chunkCodeAST(repoId, file.path, file.content, parsed);
        newChunks.push(...chunks);
      }
    }

    // File summary chunks
    for (const summary of fileSummaries) {
      newChunks.push(chunkFileSummary(repoId, summary));
    }

    // Repo summary chunks
    newChunks.push(...chunkRepoSummary(repoId, repoSummary));

    console.log(`[Pipeline] Created ${newChunks.length} new/updated AST chunks.`);

    // ── Step 10: Store new vectors in Redis ──────────────────────────────
    if (newChunks.length > 0) {
      await onProgress(`Generating embeddings for ${newChunks.length} chunks...`, 'embedding', 80);
      await vectorStore.addDocuments(repoId, newChunks);
    }

    // ── Step 11: Store commits & metrics in MongoDB ──────────────────────
    await onProgress('Saving index state to database...', 'storing', 90);
    const commits = parseGitCommits(repoFolder).map(c => ({
      ...c,
      repositoryId: repoObjectId,
      createdAt: new Date(),
    }));

    if (commits.length > 0) {
      await db.collection('commits').deleteMany({ repositoryId: repoObjectId });
      await db.collection('commits').insertMany(commits);
    }

    const durationMs = Date.now() - startTime;
    const metrics: IncrementalMetrics = {
      hits,
      misses,
      deleted,
      reindexed: misses,
      totalFiles: files.length,
      durationMs,
      cacheHitRatio,
    };

    await db.collection('repositories').updateOne(
      { _id: repoObjectId },
      {
        $set: {
          commitHash,
          incrementalMetrics: metrics,
          stats: { fileCount: files.length, loc: files.reduce((s, f) => s + f.loc, 0) },
          updatedAt: new Date(),
        },
      }
    );

    await storeSummaries(db, repoObjectId, fileSummaries, folderSummaries, repoSummary, commitHash);

    // ── Step 12: Cleanup ─────────────────────────────────────────────────
    await onProgress('Cleaning up cloned repository...', 'cleanup', 95);
    cleanupRepoFolder(repoFolder);
    repoFolder = '';

    console.log(`[Incremental Indexing Complete] Hits: ${hits}, Misses: ${misses}, Deleted: ${deleted} in ${durationMs}ms (Hit Ratio: ${cacheHitRatio})`);
    await onProgress(`Indexing complete! (${hits} Hits, ${misses} Misses in ${durationMs}ms)`, 'completed', 100);

    return {
      success: true,
      fileCount: files.length,
      chunkCount: newChunks.length,
      commitHash,
      cached: false,
      metrics,
    };

  } catch (error: any) {
    console.error('[Pipeline] Indexing failed:', error);
    if (repoFolder) cleanupRepoFolder(repoFolder);

    await db.collection('repositories').updateOne(
      { _id: repoObjectId },
      { $set: { status: 'failed', updatedAt: new Date() }, $push: { logs: `Failed: ${error.message}` } as any }
    );

    return { success: false, fileCount: 0, chunkCount: 0, commitHash: '', cached: false };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyParsedInfo(): ParsedFileInfo {
  return {
    complexity: 1, imports: [], exports: [], functions: [], classes: [],
    interfaces: [], components: [], hooks: [], routes: [], middleware: [],
    apiEndpoints: [], dbModels: [], envVars: [], symbols: [],
  };
}

function detectFrameworks(files: FileEntry[]): string[] {
  const frameworks: string[] = [];
  const pkgFile = files.find(f => f.path === 'package.json');

  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) frameworks.push('Next.js');
      if (deps.react && !deps.next) frameworks.push('React');
      if (deps.express) frameworks.push('Express');
      if (deps.fastify) frameworks.push('Fastify');
      if (deps.vue) frameworks.push('Vue');
      if (deps.svelte || deps['@sveltejs/kit']) frameworks.push('Svelte');
      if (deps.angular || deps['@angular/core']) frameworks.push('Angular');
      if (deps.tailwindcss) frameworks.push('TailwindCSS');
      if (deps.prisma || deps['@prisma/client']) frameworks.push('Prisma');
      if (deps.mongoose) frameworks.push('Mongoose');
      if (deps.mongodb) frameworks.push('MongoDB');
      if (deps.redis || deps.ioredis) frameworks.push('Redis');
    } catch {}
  }

  // Language detection
  if (files.some(f => f.extension === '.go')) frameworks.push('Go');
  if (files.some(f => f.extension === '.py')) frameworks.push('Python');
  if (files.some(f => f.extension === '.rs')) frameworks.push('Rust');
  if (files.some(f => f.extension === '.java')) frameworks.push('Java');

  if (frameworks.length === 0) frameworks.push('Generic');
  return frameworks;
}

/**
 * Group file summaries by their parent folder and generate folder summaries.
 */
async function generateFolderSummaries(fileSummaries: FileSummary[]): Promise<FolderSummary[]> {
  const folderMap = new Map<string, FileSummary[]>();

  for (const summary of fileSummaries) {
    const parts = summary.path.split('/');
    // Add to each ancestor folder
    for (let depth = 1; depth < parts.length; depth++) {
      const folderPath = parts.slice(0, depth).join('/');
      if (!folderMap.has(folderPath)) folderMap.set(folderPath, []);
      folderMap.get(folderPath)!.push(summary);
    }
  }

  const results: FolderSummary[] = [];
  // Only summarize top-level and second-level folders to control LLM costs
  const targetFolders = Array.from(folderMap.entries())
    .filter(([path]) => path.split('/').length <= 2)
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [folderPath, summaries] of targetFolders) {
    const result = await summarizeFolder(folderPath, summaries);
    results.push(result);
  }

  return results;
}

/**
 * Persist summaries and commit hash to MongoDB.
 */
async function storeSummaries(
  db: Db,
  repoObjectId: ObjectId,
  fileSummaries: FileSummary[],
  folderSummaries: FolderSummary[],
  repoSummary: RepoSummary,
  commitHash: string
): Promise<void> {
  // Clear old summaries for this repo
  await db.collection('fileSummaries').deleteMany({ repositoryId: repoObjectId });
  await db.collection('folderSummaries').deleteMany({ repositoryId: repoObjectId });

  // Store file summaries
  if (fileSummaries.length > 0) {
    await db.collection('fileSummaries').insertMany(
      fileSummaries.map(s => ({
        repositoryId: repoObjectId,
        ...s,
        createdAt: new Date(),
      }))
    );
  }

  // Store folder summaries
  if (folderSummaries.length > 0) {
    await db.collection('folderSummaries').insertMany(
      folderSummaries.map(s => ({
        repositoryId: repoObjectId,
        ...s,
        createdAt: new Date(),
      }))
    );
  }

  // Update repository document with repo summary + commit hash
  await db.collection('repositories').updateOne(
    { _id: repoObjectId },
    {
      $set: {
        repoSummary,
        commitHash,
        status: 'completed',
        progress: 100,
        updatedAt: new Date(),
      },
      $push: { logs: 'Indexing pipeline completed successfully.' } as any,
    }
  );
}
