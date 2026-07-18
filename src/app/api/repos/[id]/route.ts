import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ObjectId } from 'mongodb';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db } = await connectToDatabase();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid repository identifier' }, { status: 400 });
    }

    const repoObjectId = new ObjectId(id);

    // 1. Fetch Repository Info
    const repository = await db.collection('repositories').findOne({ _id: repoObjectId });
    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // 2. Fetch Files
    const files = await db.collection('files').find({ repositoryId: repoObjectId }).toArray();

    // 3. Fetch Commits
    const commits = await db
      .collection('commits')
      .find({ repositoryId: repoObjectId })
      .sort({ committedAt: -1 })
      .toArray();

    // 4. Fetch Agent Reports
    const reportsArray = await db.collection('agentReports').find({ repositoryId: repoObjectId }).toArray();
    const reports: Record<string, any> = {};
    reportsArray.forEach((r) => {
      reports[r.agentType] = r.content;
    });

    // 5. Construct React Flow Nodes and Edges
    const nodes: any[] = [];
    const edges: any[] = [];

    // Create a fast lookup map of paths to IDs
    const filePathToIdMap = new Map<string, string>();
    files.forEach((file) => {
      filePathToIdMap.set(file.path, file._id.toString());
    });

    // Generate Nodes
    files.forEach((file, index) => {
      // Calculate a simple circular layout position for initial view
      const angle = (index / Math.max(files.length, 1)) * 2 * Math.PI;
      const radius = 300 + Math.floor(index / 10) * 100;
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);

      nodes.push({
        id: file._id.toString(),
        type: 'fileNode',
        position: { x, y },
        data: {
          path: file.path,
          loc: file.loc,
          complexity: file.complexity,
          extension: file.extension,
          importsCount: file.imports?.length || 0,
        },
      });
    });

    // Resolve Edges from imports
    files.forEach((file) => {
      const sourceId = file._id.toString();
      const currentDir = path.dirname(file.path);

      if (!file.imports) return;

      file.imports.forEach((imp: string) => {
        // We only resolve relative project imports (e.g. starting with . or @/ or src/)
        if (!imp.startsWith('.') && !imp.startsWith('@/') && !imp.startsWith('src/')) {
          return; // Skip library imports like 'react' or 'lodash'
        }

        let resolvedPath = '';

        if (imp.startsWith('@/')) {
          resolvedPath = imp.substring(2); // Remove '@/''
        } else if (imp.startsWith('.')) {
          // Resolve relative path: join current directory with import path
          const rawJoined = path.join(currentDir, imp).replace(/\\/g, '/');
          resolvedPath = rawJoined;
        } else {
          resolvedPath = imp;
        }

        // Clean resolved path (remove double slashes or dot indicators)
        resolvedPath = path.normalize(resolvedPath).replace(/\\/g, '/');
        if (resolvedPath.startsWith('/')) resolvedPath = resolvedPath.substring(1);

        // Find candidate files in the codebase (handles omission of file extensions)
        const possiblePaths = [
          resolvedPath,
          `${resolvedPath}.ts`,
          `${resolvedPath}.tsx`,
          `${resolvedPath}.js`,
          `${resolvedPath}.jsx`,
          `${resolvedPath}/index.ts`,
          `${resolvedPath}/index.tsx`,
          `${resolvedPath}/index.js`,
        ];

        let targetId = '';
        for (const candidate of possiblePaths) {
          const match = filePathToIdMap.get(candidate);
          if (match) {
            targetId = match;
            break;
          }
        }

        if (targetId && targetId !== sourceId) {
          // Verify we don't insert duplicate edges
          const edgeId = `e-${sourceId}-${targetId}`;
          if (!edges.some((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              animated: true,
              style: { stroke: 'rgba(139, 92, 246, 0.4)', strokeWidth: 1.5 },
            });
          }
        }
      });
    });

    return NextResponse.json({
      repository,
      files: files.map((f) => ({
        _id: f._id,
        path: f.path,
        loc: f.loc,
        complexity: f.complexity,
        extension: f.extension,
      })),
      commits,
      reports,
      graph: { nodes, edges },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch details' }, { status: 500 });
  }
}
