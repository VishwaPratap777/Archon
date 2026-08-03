/**
 * indexing/summarizer.ts — AI-powered summary generation
 * 
 * Generates three levels of summaries:
 *   1. File summaries — purpose, keywords, tech, auth/db/api usage
 *   2. Folder summaries — aggregated from child file summaries
 *   3. Repository summary — full architectural overview
 * 
 * Uses callLLM with automatic provider fallback.
 * Non-source files (JSON, MD, env) get deterministic summaries without LLM calls.
 */

import { callLLM } from '../llm';
import { ParsedFileInfo } from './parser';

function parseJsonResult(text: string): any {
  try {
    const cleaned = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse JSON: ${err}\\nText: ${text}`);
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FileSummary {
  path: string;
  purpose: string;
  summary: string;
  keywords: string[];
  technologies: string[];
  authUsage: string;
  dbUsage: string;
  apiUsage: string;
  relatedFiles: string[];
}

export interface FolderSummary {
  folderPath: string;
  summary: string;
  fileCount: number;
  keyFiles: string[];
}

export interface RepoSummary {
  projectOverview: string;
  techStack: string[];
  architecture: string;
  authFlow: string;
  dbFlow: string;
  apiFlow: string;
  folderResponsibilities: Record<string, string>;
  importantFiles: { path: string; reason: string }[];
  dependencyHighlights: string[];
}

// ─── File Summary Generation ─────────────────────────────────────────────────

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java']);

/**
 * Generate an AI summary for a single file.
 * Skips LLM call for non-source or tiny files (uses deterministic metadata instead).
 */
export async function summarizeFile(
  filePath: string,
  content: string,
  parsed: ParsedFileInfo,
  options?: { userId?: string; repositoryId?: string }
): Promise<FileSummary> {
  const ext = filePath.split('.').pop() || '';
  const isSource = SOURCE_EXTENSIONS.has(`.${ext}`);

  // Deterministic summary for non-source files (no LLM call needed)
  if (!isSource || content.split('\n').length <= 10) {
    return {
      path: filePath,
      purpose: inferPurposeFromPath(filePath),
      summary: `Configuration/data file at ${filePath} with ${content.split('\n').length} lines.`,
      keywords: extractKeywordsFromPath(filePath),
      technologies: [],
      authUsage: 'None',
      dbUsage: 'None',
      apiUsage: 'None',
      relatedFiles: [],
    };
  }

  // Build a compact representation for the LLM (minimize tokens)
  const metadataContext = [
    `File: ${filePath}`,
    parsed.functions.length > 0 ? `Functions: ${parsed.functions.join(', ')}` : '',
    parsed.classes.length > 0 ? `Classes: ${parsed.classes.join(', ')}` : '',
    parsed.interfaces.length > 0 ? `Interfaces: ${parsed.interfaces.join(', ')}` : '',
    parsed.components.length > 0 ? `Components: ${parsed.components.join(', ')}` : '',
    parsed.hooks.length > 0 ? `Hooks: ${parsed.hooks.join(', ')}` : '',
    parsed.routes.length > 0 ? `Routes: ${parsed.routes.join(', ')}` : '',
    parsed.middleware.length > 0 ? `Middleware: ${parsed.middleware.join(', ')}` : '',
    parsed.dbModels.length > 0 ? `DB Collections/Models: ${parsed.dbModels.join(', ')}` : '',
    parsed.envVars.length > 0 ? `Env Vars: ${parsed.envVars.join(', ')}` : '',
    parsed.imports.length > 0 ? `Imports: ${parsed.imports.slice(0, 15).join(', ')}` : '',
    parsed.exports.length > 0 ? `Exports: ${parsed.exports.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  // Truncate content to save tokens (first 150 lines max)
  const truncatedContent = content.split('\n').slice(0, 150).join('\n');

  const systemPrompt = `You are a code analysis expert. Summarize the given source file concisely.
Return ONLY valid JSON matching this exact structure:
{
  "purpose": "One sentence describing what this file does",
  "summary": "2-3 sentence technical summary",
  "keywords": ["keyword1", "keyword2"],
  "technologies": ["tech1", "tech2"],
  "authUsage": "How auth is used, or 'None'",
  "dbUsage": "How database is used, or 'None'",
  "apiUsage": "API routes or calls made, or 'None'",
  "relatedFiles": ["likely/related/file.ts"]
}`;

  const prompt = `Analyze this file:

${metadataContext}

--- Source Code ---
${truncatedContent}
---

Return ONLY the JSON summary.`;

  try {
    const res = await callLLM(prompt, systemPrompt, { ...options, agentType: 'file_summary' });
    const parsed = parseJsonResult(res.text);
    return {
      path: filePath,
      purpose: parsed.purpose || '',
      summary: parsed.summary || '',
      keywords: parsed.keywords || [],
      technologies: parsed.technologies || [],
      authUsage: parsed.authUsage || 'None',
      dbUsage: parsed.dbUsage || 'None',
      apiUsage: parsed.apiUsage || 'None',
      relatedFiles: parsed.relatedFiles || [],
    };
  } catch (err) {
    console.warn(`[Summarizer] LLM failed for ${filePath}:`, (err as Error).message);
    return {
      path: filePath,
      purpose: inferPurposeFromPath(filePath),
      summary: `Source file with ${parsed.functions.length} functions, ${parsed.classes.length} classes, complexity ${parsed.complexity}.`,
      keywords: extractKeywordsFromPath(filePath),
      technologies: inferTechFromImports(parsed.imports),
      authUsage: parsed.routes.some(r => r.includes('auth') || r.includes('login')) ? 'Contains auth routes' : 'None',
      dbUsage: parsed.dbModels.length > 0 ? `Uses collections: ${parsed.dbModels.join(', ')}` : 'None',
      apiUsage: parsed.routes.length > 0 ? parsed.routes.join(', ') : 'None',
      relatedFiles: [],
    };
  }
}

// ─── Folder Summary Generation ───────────────────────────────────────────────

/**
 * Generate a summary for a folder by aggregating its file summaries.
 * Uses a single LLM call per folder (not per file).
 */
export async function summarizeFolder(
  folderPath: string,
  fileSummaries: FileSummary[],
  options?: { userId?: string; repositoryId?: string }
): Promise<FolderSummary> {
  if (fileSummaries.length === 0) {
    return { folderPath, summary: 'Empty folder.', fileCount: 0, keyFiles: [] };
  }

  // For folders with few files, skip LLM — just aggregate
  if (fileSummaries.length <= 3) {
    return {
      folderPath,
      summary: fileSummaries.map(f => `${f.path}: ${f.purpose}`).join('. '),
      fileCount: fileSummaries.length,
      keyFiles: fileSummaries.map(f => f.path),
    };
  }

  const fileList = fileSummaries
    .map(f => `- ${f.path}: ${f.purpose}`)
    .join('\n');

  const systemPrompt = `You are a code analyst. Summarize what this folder does based on its files.
Return ONLY valid JSON: { "summary": "...", "keyFiles": ["path1", "path2"] }`;

  const prompt = `Folder: ${folderPath}
Files:
${fileList}

Summarize the folder's responsibility and list the 2-3 most important files.`;

  try {
    const res = await callLLM(prompt, systemPrompt, { ...options, agentType: 'folder_summary' });
    const parsed = parseJsonResult(res.text);
    return {
      folderPath,
      summary: parsed.summary || '',
      fileCount: fileSummaries.length,
      keyFiles: parsed.keyFiles || [],
    };
  } catch (err) {
    console.warn(`[Summarizer] Folder summary failed for ${folderPath}:`, (err as Error).message);
    return {
      folderPath,
      summary: `Contains ${fileSummaries.length} files handling: ${fileSummaries.slice(0, 3).map(f => f.purpose).join(', ')}.`,
      fileCount: fileSummaries.length,
      keyFiles: fileSummaries.slice(0, 3).map(f => f.path),
    };
  }
}

// ─── Repository Summary Generation ──────────────────────────────────────────

/**
 * Generate the top-level repository summary from all folder summaries.
 */
export async function summarizeRepository(
  repoName: string,
  folderSummaries: FolderSummary[],
  fileSummaries: FileSummary[],
  frameworks: string[],
  options?: { userId?: string; repositoryId?: string }
): Promise<RepoSummary> {
  const folderOverview = folderSummaries
    .filter(f => f.summary && f.summary !== 'Empty folder.')
    .map(f => `${f.folderPath}: ${f.summary}`)
    .join('\n');

  // Collect auth/db/api files for targeted analysis
  const authFiles = fileSummaries.filter(f => f.authUsage !== 'None').map(f => `${f.path}: ${f.authUsage}`);
  const dbFiles = fileSummaries.filter(f => f.dbUsage !== 'None').map(f => `${f.path}: ${f.dbUsage}`);
  const apiFiles = fileSummaries.filter(f => f.apiUsage !== 'None').map(f => `${f.path}: ${f.apiUsage}`);

  const systemPrompt = `You are a senior software architect analyzing a codebase.
Return ONLY valid JSON:
{
  "projectOverview": "2-3 sentence project description",
  "techStack": ["tech1", "tech2"],
  "architecture": "Architecture description (layers, patterns, structure)",
  "authFlow": "How authentication works end-to-end, or 'None detected'",
  "dbFlow": "How database is used (ORM, collections, patterns), or 'None detected'",
  "apiFlow": "API style and key routes, or 'None detected'",
  "folderResponsibilities": { "folder1": "purpose", "folder2": "purpose" },
  "importantFiles": [{ "path": "...", "reason": "..." }],
  "dependencyHighlights": ["Key dependency insight 1"]
}`;

  const prompt = `Repository: ${repoName}
Detected Frameworks: ${frameworks.join(', ')}

Folder Structure:
${folderOverview}

Auth-Related Files:
${authFiles.length > 0 ? authFiles.join('\n') : 'None detected'}

Database-Related Files:
${dbFiles.length > 0 ? dbFiles.join('\n') : 'None detected'}

API-Related Files:
${apiFiles.length > 0 ? apiFiles.join('\n') : 'None detected'}

Total Files: ${fileSummaries.length}

Produce a comprehensive architectural analysis.`;

  try {
    const res = await callLLM(prompt, systemPrompt, { ...options, agentType: 'repo_summary' });
    return parseJsonResult(res.text);
  } catch (err) {
    console.warn(`[Summarizer] Repo summary failed:`, (err as Error).message);
    // Deterministic fallback
    const folderPurposes: Record<string, string> = {};
    folderSummaries.forEach(f => { folderPurposes[f.folderPath] = f.summary; });

    return {
      projectOverview: `${repoName} is a ${frameworks.join('/')} project with ${fileSummaries.length} source files.`,
      techStack: frameworks,
      architecture: 'Could not determine — LLM unavailable.',
      authFlow: authFiles.length > 0 ? authFiles.join('; ') : 'None detected',
      dbFlow: dbFiles.length > 0 ? dbFiles.join('; ') : 'None detected',
      apiFlow: apiFiles.length > 0 ? apiFiles.join('; ') : 'None detected',
      folderResponsibilities: folderPurposes,
      importantFiles: fileSummaries
        .filter(f => f.path.match(/(server|index|app|main|auth|db|route)/i))
        .slice(0, 5)
        .map(f => ({ path: f.path, reason: f.purpose })),
      dependencyHighlights: frameworks.map(f => `Uses ${f}`),
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferPurposeFromPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.includes('auth')) return 'Authentication logic';
  if (lower.includes('route') || lower.includes('router')) return 'Route definitions';
  if (lower.includes('middleware')) return 'Middleware';
  if (lower.includes('model') || lower.includes('schema')) return 'Data model/schema';
  if (lower.includes('config')) return 'Configuration';
  if (lower.includes('util') || lower.includes('helper')) return 'Utility functions';
  if (lower.includes('component')) return 'UI component';
  if (lower.includes('hook')) return 'React hook';
  if (lower.includes('test') || lower.includes('spec')) return 'Test file';
  if (lower.endsWith('.md')) return 'Documentation';
  if (lower.endsWith('.json')) return 'JSON configuration';
  if (lower.endsWith('.env') || lower.includes('.env.')) return 'Environment variables';
  return 'Source file';
}

function extractKeywordsFromPath(filePath: string): string[] {
  return filePath
    .replace(/[\/\\]/g, ' ')
    .replace(/\.[^.]+$/, '')
    .split(/[\s_\-.]/)
    .filter(w => w.length > 2);
}

function inferTechFromImports(imports: string[]): string[] {
  const techMap: Record<string, string> = {
    express: 'Express', react: 'React', next: 'Next.js', vue: 'Vue',
    mongoose: 'Mongoose', mongodb: 'MongoDB', prisma: 'Prisma',
    jsonwebtoken: 'JWT', bcrypt: 'bcrypt', passport: 'Passport.js',
    axios: 'Axios', 'node-fetch': 'node-fetch',
    redis: 'Redis', ioredis: 'Redis',
  };

  const techs: string[] = [];
  for (const imp of imports) {
    const base = imp.split('/')[0].replace(/^@/, '');
    if (techMap[base] && !techs.includes(techMap[base])) {
      techs.push(techMap[base]);
    }
  }
  return techs;
}
