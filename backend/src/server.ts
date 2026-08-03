import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { ObjectId } from 'mongodb';
import { connectToDatabase, getSettings } from './lib/db';
import { parseGithubUrl, cloneRepository, walkRepository, parseGitCommits, cleanupRepoFolder } from './lib/git';
import { parseSourceFile } from './lib/parser';
import { vectorizeRepository } from './lib/rag';
import {
  runArchitectureAgent,
  runOnboardingAgent,
  runTechDebtAgent,
  runSecurityAgent,
  runHistoryAgent,
  runChatAgent,
  RepositoryContext,
} from './lib/agents';
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken,
  optionalAuthenticateToken,
  AuthRequest,
} from './lib/auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// --- Auth Endpoints ---

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const { db } = await connectToDatabase();
    const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const newUser = {
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);
    const userId = result.insertedId.toString();

    const token = generateToken({
      userId,
      email: newUser.email,
      username: newUser.username,
    });

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        username: newUser.username,
        email: newUser.email,
        tokenUsage: newUser.tokenUsage,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Failed to register user.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userId = user._id.toString();
    const token = generateToken({
      userId,
      email: user.email,
      username: user.username,
    });

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        username: user.username,
        email: user.email,
        tokenUsage: user.tokenUsage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requestCount: 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Failed to log in.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { db } = await connectToDatabase();
    const userId = req.user?.userId;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user identifier.' });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      tokenUsage: user.tokenUsage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      },
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch profile.' });
  }
});

// GET /api/auth/usage
app.get('/api/auth/usage', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { db } = await connectToDatabase();
    const userId = req.user?.userId;
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user identifier.' });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const userObjId = new ObjectId(userId);

    const logs = await db.collection('tokenLogs')
      .find({ userId: userObjId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      tokenUsage: user?.tokenUsage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      },
      logs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch usage logs.' });
  }
});

// 1. GET /api/repos -> List all repos
app.get('/api/repos', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const repos = await db
      .collection('repositories')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(repos);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to list repositories' });
  }
});

// 2. DELETE /api/repos -> Clear database
app.delete('/api/repos', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    await db.collection('repositories').deleteMany({});
    await db.collection('files').deleteMany({});
    await db.collection('commits').deleteMany({});
    await db.collection('agentReports').deleteMany({});
    res.json({ success: true, message: 'Database reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reset database' });
  }
});

// 3. POST /api/repos -> Initiate analysis
app.post('/api/repos', optionalAuthenticateToken, async (req: AuthRequest, res) => {
  try {
    const { db } = await connectToDatabase();
    const { githubUrl } = req.body;
    const userId = req.user?.userId;

    if (!githubUrl || !githubUrl.includes('github.com')) {
      return res.status(400).json({ error: 'Please enter a valid GitHub repository URL' });
    }

    // Check limits only if logged in
    if (userId && ObjectId.isValid(userId)) {
      const userObjectId = new ObjectId(userId);
      const user = await db.collection('users').findOne({ _id: userObjectId });
      
      if (user) {
        const repoCount = await db.collection('repositories').countDocuments({ userId: userObjectId });
        if (repoCount >= 3) {
          return res.status(403).json({ error: 'Free tier limit reached. You can only scan up to 3 repositories.' });
        }

        const tokens = user.tokenUsage?.totalTokens || 0;
        if (tokens >= 100000) {
          return res.status(403).json({ error: 'Token limit reached. You have consumed your 100,000 free tokens.' });
        }
      }
    }

    const { owner, name } = parseGithubUrl(githubUrl);

    // Create a new repository tracking record
    const insertResult = await db.collection('repositories').insertOne({
      githubUrl,
      owner,
      name,
      userId: userId && ObjectId.isValid(userId) ? new ObjectId(userId) : null,
      status: 'pending',
      progress: 0,
      logs: ['Analysis job created'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const repoId = insertResult.insertedId;

    // Start background processor
    analyzeRepositoryInBackground(repoId.toString(), githubUrl, userId);

    res.json({
      success: true,
      repositoryId: repoId.toString(),
      message: 'Analysis initiated successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initiate analysis' });
  }
});

// 4. GET /api/repos/:id -> Get repository details, files, commits, and reports
app.get('/api/repos/:id', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid repository identifier' });
    }

    const repoObjectId = new ObjectId(id);

    // Fetch repository info
    const repository = await db.collection('repositories').findOne({ _id: repoObjectId });
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Fetch files
    const files = await db.collection('files').find({ repositoryId: repoObjectId }).toArray();

    // Fetch commits
    const commits = await db
      .collection('commits')
      .find({ repositoryId: repoObjectId })
      .sort({ committedAt: -1 })
      .toArray();

    // Fetch agent reports
    const reportsArray = await db.collection('agentReports').find({ repositoryId: repoObjectId }).toArray();
    const reports: Record<string, any> = {};
    reportsArray.forEach((r) => {
      reports[r.agentType] = r.content;
    });

    // Construct React Flow Nodes and Edges
    const nodes: any[] = [];
    const edges: any[] = [];

    const filePathToIdMap = new Map<string, string>();
    files.forEach((file) => {
      filePathToIdMap.set(file.path, file._id.toString());
    });

    files.forEach((file, index) => {
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

    files.forEach((file) => {
      const sourceId = file._id.toString();
      const currentDir = path.dirname(file.path);

      if (!file.imports) return;

      file.imports.forEach((imp: string) => {
        if (!imp.startsWith('.') && !imp.startsWith('@/') && !imp.startsWith('src/')) {
          return;
        }

        let resolvedPath = '';
        if (imp.startsWith('@/')) {
          resolvedPath = imp.substring(2);
        } else if (imp.startsWith('.')) {
          const rawJoined = path.join(currentDir, imp).replace(/\\/g, '/');
          resolvedPath = rawJoined;
        } else {
          resolvedPath = imp;
        }

        resolvedPath = path.normalize(resolvedPath).replace(/\\/g, '/');
        if (resolvedPath.startsWith('/')) resolvedPath = resolvedPath.substring(1);

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

    res.json({
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
    res.status(500).json({ error: error.message || 'Failed to fetch details' });
  }
});

// 4.5 POST /api/repos/:id/chat -> Chat with Repository
app.post('/api/repos/:id/chat', optionalAuthenticateToken, async (req: AuthRequest, res) => {
  try {
    const { db } = await connectToDatabase();
    const { id } = req.params;
    const { query } = req.body;
    const userId = req.user?.userId;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (userId && ObjectId.isValid(userId)) {
      const userObjectId = new ObjectId(userId);
      const user = await db.collection('users').findOne({ _id: userObjectId });
      if (user) {
        const tokens = user.tokenUsage?.totalTokens || 0;
        if (tokens >= 100000) {
          return res.status(403).json({ error: 'Token limit reached. You have consumed your 100,000 free tokens.' });
        }
      }
    }

    const repoObjectId = new ObjectId(id);
    const repository = await db.collection('repositories').findOne({ _id: repoObjectId });
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const files = await db.collection('files').find({ repositoryId: repoObjectId }).toArray();
    const commits = await db.collection('commits').find({ repositoryId: repoObjectId }).sort({ committedAt: -1 }).toArray();

    const ctx: RepositoryContext = {
      repositoryId: id,
      userId: userId,
      githubUrl: repository.githubUrl,
      name: repository.name,
      owner: repository.owner,
      files: files.map((f: any) => ({
        path: f.path,
        loc: f.loc,
        complexity: f.complexity,
        imports: f.imports || [],
        functionsCount: f.functionsCount || 0,
        classesCount: f.classesCount || 0
      })),
      commits: commits.map((c: any) => ({
        hash: c.hash,
        author: c.author,
        message: c.message,
        committedAt: c.committedAt
      })),
      frameworks: repository.frameworks || []
    };

    const chatResponse = await runChatAgent(ctx, query);
    res.json(chatResponse);

  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Chat query failed' });
  }
});

// 5. GET /api/repos/:id/status -> Get parsing status and logs
app.get('/api/repos/:id/status', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid repository identifier' });
    }

    const repo = await db.collection('repositories').findOne({ _id: new ObjectId(id) });
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    res.json({
      status: repo.status,
      progress: repo.progress,
      logs: repo.logs || [],
      frameworks: repo.frameworks || [],
      stats: repo.stats || {},
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch status' });
  }
});

// 6. GET /api/repos/:id/files -> Fetch parsed file content
app.get('/api/repos/:id/files', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { id } = req.params;
    const filePath = req.query.path as string;

    if (!ObjectId.isValid(id) || !filePath) {
      return res.status(400).json({ error: 'Invalid parameters provided' });
    }

    const repoObjectId = new ObjectId(id);
    const file = await db.collection('files').findOne({
      repositoryId: repoObjectId,
      path: filePath,
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      _id: file._id,
      path: file.path,
      content: file.content || '',
      loc: file.loc || 0,
      complexity: file.complexity || 1,
      extension: file.extension || '',
      imports: file.imports || [],
      functionsCount: file.functionsCount || 0,
      classesCount: file.classesCount || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch file content' });
  }
});

// 7. GET /api/settings -> Fetch credentials masked
app.get('/api/settings', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const settings: any = await db.collection('settings').findOne({}) || {};

    const response = {
      githubPat: settings.githubPat ? `ghp_***${settings.githubPat.slice(-4)}` : '',
      groqApiKey: settings.groqApiKey ? `gsk_***${settings.groqApiKey.slice(-4)}` : '',
      openaiApiKey: settings.openaiApiKey ? `sk-proj-***${settings.openaiApiKey.slice(-4)}` : '',
      anthropicApiKey: settings.anthropicApiKey ? `sk-ant-***${settings.anthropicApiKey.slice(-4)}` : '',
      hasGithubPat: !!settings.githubPat,
      hasGroqApiKey: !!settings.groqApiKey,
      hasOpenaiApiKey: !!settings.openaiApiKey,
      hasAnthropicApiKey: !!settings.anthropicApiKey,
    };

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// 8. POST /api/settings -> Save credentials
app.post('/api/settings', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const data = req.body;

    const updates: Record<string, string> = {};

    if (data.githubPat && !data.githubPat.includes('***')) {
      updates.githubPat = data.githubPat.trim();
    }
    if (data.groqApiKey && !data.groqApiKey.includes('***')) {
      updates.groqApiKey = data.groqApiKey.trim();
    }
    if (data.openaiApiKey && !data.openaiApiKey.includes('***')) {
      updates.openaiApiKey = data.openaiApiKey.trim();
    }
    if (data.anthropicApiKey && !data.anthropicApiKey.includes('***')) {
      updates.anthropicApiKey = data.anthropicApiKey.trim();
    }

    if (Object.keys(updates).length > 0) {
      await db.collection('settings').updateOne(
        {},
        { $set: updates },
        { upsert: true }
      );
    }

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save settings' });
  }
});

// Background Analysis Worker Task
async function analyzeRepositoryInBackground(repoIdStr: string, githubUrl: string, userIdStr?: string) {
  const { db } = await connectToDatabase();
  const repoId = new ObjectId(repoIdStr);
  let repoFolder = '';

  const logStep = async (msg: string, status: string, progress: number) => {
    console.log(`[Repo ${repoIdStr}] [${status} ${progress}%]: ${msg}`);
    await db.collection('repositories').updateOne(
      { _id: repoId },
      {
        $set: { status, progress, updatedAt: new Date() },
        $push: { logs: msg } as any,
      }
    );
  };

  try {
    const settings: any = await getSettings();
    const githubPat = settings.githubPat;

    // 1. Clone repo
    await logStep('Cloning repository from GitHub...', 'cloning', 10);
    const cloneResult = await cloneRepository(githubUrl, githubPat);
    repoFolder = cloneResult.repoPath;

    // 2. Walk directory files
    await logStep('Walking repository files and reading configurations...', 'parsing', 25);
    const files = walkRepository(repoFolder);

    const frameworks: string[] = [];
    const packageJson = files.find((f) => f.path === 'package.json');
    if (packageJson) {
      try {
        const parsedPkg = JSON.parse(packageJson.content);
        const deps = { ...parsedPkg.dependencies, ...parsedPkg.devDependencies };
        if (deps.next) frameworks.push('Next.js');
        if (deps.react && !deps.next) frameworks.push('React');
        if (deps.express) frameworks.push('Express');
        if (deps.vue) frameworks.push('Vue');
        if (deps.tailwind) frameworks.push('TailwindCSS');
      } catch (err) {
        console.warn('Failed to parse package.json dependencies', err);
      }
    }
    if (files.some((f) => f.path.endsWith('.go'))) frameworks.push('Go');
    if (files.some((f) => f.path.endsWith('.py'))) frameworks.push('Python');
    if (frameworks.length === 0) frameworks.push('Generic node/script');

    const locSum = files.reduce((acc, f) => acc + f.loc, 0);
    await db.collection('repositories').updateOne(
      { _id: repoId },
      {
        $set: {
          frameworks,
          stats: {
            loc: locSum,
            fileCount: files.length,
          },
        },
      }
    );

    // 3. Parser AST
    await logStep(`Parsing AST & complexity metrics for ${files.length} files...`, 'parsing', 40);
    const fileDocs = [];
    const contextFiles = [];

    for (const file of files) {
      const isSource = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go'].includes(file.extension);
      let complexity = 1;
      let imports: string[] = [];
      let functionsCount = 0;
      let classesCount = 0;

      if (isSource) {
        const astInfo = await parseSourceFile(file.content, file.extension);
        complexity = astInfo.complexity;
        imports = astInfo.imports;
        functionsCount = astInfo.functionsCount;
        classesCount = astInfo.classesCount;
      }

      const fileDoc = {
        repositoryId: repoId,
        path: file.path,
        content: file.content.slice(0, 100000),
        sizeBytes: file.sizeBytes,
        loc: file.loc,
        extension: file.extension,
        complexity,
        imports,
        functionsCount,
        classesCount,
        createdAt: new Date(),
      };
      
      fileDocs.push(fileDoc);
      contextFiles.push({
        path: file.path,
        loc: file.loc,
        complexity,
        imports,
        functionsCount,
        classesCount,
      });
    }

    if (fileDocs.length > 0) {
      await db.collection('files').insertMany(fileDocs);
      await vectorizeRepository(repoId.toString(), fileDocs);
    }

    // 4. Git commit history
    await logStep('Extracting Git log commit history themes...', 'parsing', 60);
    const commits = parseGitCommits(repoFolder);
    const commitDocs = commits.map((c) => ({
      ...c,
      repositoryId: repoId,
      createdAt: new Date(),
    }));

    if (commitDocs.length > 0) {
      await db.collection('commits').insertMany(commitDocs);
    }

    // 5. Run AI Agents
    await logStep('Invoking specialized AI reasoning agents...', 'agents', 75);
    const agentCtx: RepositoryContext = {
      githubUrl,
      name: cloneResult.repoName,
      owner: cloneResult.repoOwner,
      files: contextFiles,
      commits: commits.map((c) => ({
        hash: c.hash,
        author: c.author,
        message: c.message,
        committedAt: c.committedAt,
      })),
      frameworks,
      userId: userIdStr,
      repositoryId: repoIdStr,
    };

    const [arch, onboarding, techDebt, security, history] = await Promise.all([
      runArchitectureAgent(agentCtx).catch((e) => ({ error: e.message })),
      runOnboardingAgent(agentCtx).catch((e) => ({ error: e.message })),
      runTechDebtAgent(agentCtx).catch((e) => ({ error: e.message })),
      runSecurityAgent(agentCtx).catch((e) => ({ error: e.message })),
      runHistoryAgent(agentCtx).catch((e) => ({ error: e.message })),
    ]);

    const reportDocs = [
      { repositoryId: repoId, agentType: 'architecture', content: arch, createdAt: new Date() },
      { repositoryId: repoId, agentType: 'onboarding', content: onboarding, createdAt: new Date() },
      { repositoryId: repoId, agentType: 'techDebt', content: techDebt, createdAt: new Date() },
      { repositoryId: repoId, agentType: 'security', content: security, createdAt: new Date() },
      { repositoryId: repoId, agentType: 'history', content: history, createdAt: new Date() },
    ];
    await db.collection('agentReports').insertMany(reportDocs);

    await logStep('Finalizing files and cleaning up scratch disk...', 'finalizing', 90);
    cleanupRepoFolder(repoFolder);

    await logStep('Analysis finalized successfully! Dashboard generated.', 'completed', 100);
  } catch (error: any) {
    console.error('Analysis failed', error);
    await logStep(`Analysis aborted: ${error.message || error}`, 'failed', 0);
    if (repoFolder) cleanupRepoFolder(repoFolder);
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
