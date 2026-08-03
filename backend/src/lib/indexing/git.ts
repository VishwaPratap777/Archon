/**
 * indexing/git.ts — Git operations for the indexing pipeline
 * 
 * Handles repository cloning, file walking, commit hash extraction, and cleanup.
 * All cloned repos are temporary and deleted after indexing completes.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CloneResult {
  repoPath: string;
  repoName: string;
  repoOwner: string;
}

export interface FileEntry {
  path: string;
  content: string;
  sizeBytes: number;
  loc: number;
  extension: string;
  hash: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EXCLUDED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage',
  '.yarn', '.pnp', '__pycache__', '.pytest_cache', 'venv', '.venv',
  'vendor', '.turbo', '.cache', '.parcel-cache',
]);

const EXCLUDED_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
  'readme.md', 'readme', 'license', 'licence', 'changelog.md',
  '.DS_Store', 'Thumbs.db', '.gitignore', '.env', '.env.local', '.env.example',
]);

const EXCLUDED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp4', '.mp3', '.avi', '.mov', '.wav', '.ogg',
  '.woff', '.woff2', '.ttf', '.eot',
  '.wasm', '.dll', '.exe', '.so', '.dylib',
  '.db', '.sqlite', '.sqlite3',
  '.min.js', '.min.css', '.map',
]);

const MAX_FILE_SIZE = 200_000; // 200KB — skip anything larger

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Parse a GitHub URL into owner/name.
 */
export function parseGithubUrl(githubUrl: string): { owner: string; name: string } {
  const cleaned = githubUrl.replace(/\.git$/, '').replace(/\/$/, '');
  const parts = cleaned.split('/');
  if (parts.length < 2) throw new Error('Invalid GitHub URL format');
  return {
    owner: parts[parts.length - 2],
    name: parts[parts.length - 1],
  };
}

/**
 * Clone a repository into a temporary scratch directory.
 * Uses --depth 1 for speed (we only need the current snapshot).
 */
export async function cloneRepository(
  githubUrl: string,
  githubPat?: string
): Promise<CloneResult> {
  const { owner, name } = parseGithubUrl(githubUrl);

  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const uniqueName = `${owner}-${name}-${Date.now()}`;
  const targetPath = path.join(scratchDir, uniqueName);

  let cloneUrl = githubUrl;
  if (githubPat) {
    cloneUrl = githubUrl.replace('https://github.com/', `https://${githubPat}@github.com/`);
  }

  try {
    execSync(`git clone --depth 1 "${cloneUrl}" "${targetPath}"`, {
      stdio: 'ignore',
      timeout: 120_000, // 2 minutes max
    });
  } catch (error: any) {
    throw new Error(`Git clone failed: ${error.message || error}`);
  }

  return { repoPath: targetPath, repoName: name, repoOwner: owner };
}

/**
 * Get the HEAD commit hash of a cloned repository.
 * Used for cache invalidation — skip re-indexing if hash hasn't changed.
 */
export function getHeadCommitHash(repoPath: string): string {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: repoPath,
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Parse recent git commits for the repository history.
 */
export function parseGitCommits(repoPath: string) {
  try {
    const output = execSync('git log -n 50 --pretty=format:"%H|%an|%s|%aI"', {
      cwd: repoPath,
      encoding: 'utf8',
    });
    return output.split('\\n').filter(Boolean).map(line => {
      const [hash, author, message, date] = line.split('|');
      return { hash, author, message, committedAt: new Date(date) };
    });
  } catch {
    return [];
  }
}

/**
 * Recursively walk a repository and return all parseable source files.
 * Respects the exclusion lists for dirs, files, and extensions.
 */
export function walkRepository(repoPath: string): FileEntry[] {
  const results: FileEntry[] = [];

  function walk(currentDir: string) {
    let entries: string[];
    try {
      entries = fs.readdirSync(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const relativePath = path.relative(repoPath, fullPath).replace(/\\/g, '/');

      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry)) continue;
        walk(fullPath);
      } else if (stat.isFile()) {
        if (EXCLUDED_FILES.has(entry)) continue;

        const ext = path.extname(entry).toLowerCase();
        if (EXCLUDED_EXTENSIONS.has(ext)) continue;
        if (stat.size > MAX_FILE_SIZE) continue;

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          results.push({
            path: relativePath,
            content,
            sizeBytes: stat.size,
            loc: content.split('\n').length,
            extension: ext,
            hash,
          });
        } catch {
          // Skip binary or unreadable files silently
        }
      }
    }
  }

  walk(repoPath);
  return results;
}

/**
 * Delete a cloned repository folder after indexing is complete.
 */
export function cleanupRepoFolder(repoPath: string): void {
  try {
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
      console.log(`[Git] Cleaned up: ${repoPath}`);
    }
  } catch (err) {
    console.error(`[Git] Failed to clean up ${repoPath}:`, err);
  }
}
