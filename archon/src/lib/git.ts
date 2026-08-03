import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface CloneResult {
  repoPath: string;
  repoName: string;
  repoOwner: string;
}

export function parseGithubUrl(githubUrl: string): { owner: string; name: string } {
  // Cleans URL and gets owner & name
  const cleaned = githubUrl.replace(/\.git$/, '').replace(/\/$/, '');
  const parts = cleaned.split('/');
  if (parts.length < 2) {
    throw new Error('Invalid GitHub URL format');
  }
  const name = parts[parts.length - 1];
  const owner = parts[parts.length - 2];
  return { owner, name };
}

export async function cloneRepository(
  githubUrl: string,
  githubPat?: string
): Promise<CloneResult> {
  const { owner, name } = parseGithubUrl(githubUrl);
  
  // Create a scratch folder for downloads
  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const uniqueName = `${owner}-${name}-${Date.now()}`;
  const targetPath = path.join(scratchDir, uniqueName);

  // If PAT is provided, inject it into the cloning URL
  let cloneUrl = githubUrl;
  if (githubPat) {
    // Format: https://<token>@github.com/owner/repo.git
    cloneUrl = githubUrl.replace('https://github.com/', `https://${githubPat}@github.com/`);
  }

  // Execute git clone command asynchronously/synchronously
  try {
    execSync(`git clone --depth 100 "${cloneUrl}" "${targetPath}"`, {
      stdio: 'ignore',
      timeout: 60000, // 1 minute max clone
    });
  } catch (error: any) {
    throw new Error(`Git clone failed: ${error.message || error}`);
  }

  return {
    repoPath: targetPath,
    repoName: name,
    repoOwner: owner,
  };
}

export interface FileMetadata {
  path: string; // Relative to repo root
  content: string;
  sizeBytes: number;
  loc: number;
  extension: string;
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '.yarn',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
]);

const EXCLUDED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.pdf', '.zip', '.tar', '.gz',
  '.mp4', '.mp3', '.woff', '.woff2', '.ttf', '.eot', '.wasm', '.dll', '.exe', '.db', '.sqlite'
]);

export function walkRepository(repoPath: string): FileMetadata[] {
  const results: FileMetadata[] = [];

  function helper(currentDir: string) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const relativePath = path.relative(repoPath, fullPath).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (EXCLUDED_DIRS.has(file)) continue;
        helper(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (EXCLUDED_EXTENSIONS.has(ext)) continue;

        // Skip files that are too large (e.g. over 1.5MB) to avoid token issues and crashes
        if (stat.size > 1500000) continue;

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const loc = content.split('\n').length;

          results.push({
            path: relativePath,
            content,
            sizeBytes: stat.size,
            loc,
            extension: ext,
          });
        } catch (e) {
          // Skip binary files that fail utf8 reading
          console.warn(`Skipping binary or unreadable file: ${relativePath}`);
        }
      }
    }
  }

  helper(repoPath);
  return results;
}

export function parseGitCommits(repoPath: string): any[] {
  try {
    // Format: Hash | Author | Email | Date | Subject
    const logOutput = execSync(
      `git log -n 100 --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso`,
      { cwd: repoPath, encoding: 'utf8' }
    );
    
    if (!logOutput.trim()) return [];

    return logOutput.split('\n').map((line) => {
      const [hash, author, email, dateStr, message] = line.split('|');
      return {
        hash,
        author,
        email,
        committedAt: new Date(dateStr),
        message,
      };
    });
  } catch (error) {
    console.error('Failed to parse git commits', error);
    return [];
  }
}

export function cleanupRepoFolder(repoPath: string) {
  try {
    if (fs.existsSync(repoPath)) {
      // Helper function to force delete folder on Windows
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Failed to clean up repo directory ${repoPath}:`, err);
  }
}
