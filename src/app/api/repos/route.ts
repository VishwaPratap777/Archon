import { NextResponse } from 'next/server';
import { connectToDatabase, getSettings } from '@/lib/db';
import { parseGithubUrl, cloneRepository, walkRepository, parseGitCommits, cleanupRepoFolder } from '@/lib/git';
import { parseSourceFile } from '@/lib/parser';
import {
  runArchitectureAgent,
  runOnboardingAgent,
  runTechDebtAgent,
  runSecurityAgent,
  runHistoryAgent,
  RepositoryContext,
} from '@/lib/agents';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const repos = await db
      .collection('repositories')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json(repos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to list repositories' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { db } = await connectToDatabase();
    // Drop all collections associated with repository intelligence
    await db.collection('repositories').deleteMany({});
    await db.collection('files').deleteMany({});
    await db.collection('commits').deleteMany({});
    await db.collection('agentReports').deleteMany({});
    
    return NextResponse.json({ success: true, message: 'Database reset successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reset database' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await connectToDatabase();
    const { githubUrl } = await request.json();

    if (!githubUrl || !githubUrl.includes('github.com')) {
      return NextResponse.json({ error: 'Please enter a valid GitHub repository URL' }, { status: 400 });
    }

    const { owner, name } = parseGithubUrl(githubUrl);

    // Create a new repository tracking record
    const insertResult = await db.collection('repositories').insertOne({
      githubUrl,
      owner,
      name,
      status: 'pending',
      progress: 0,
      logs: ['Analysis job created'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const repoId = insertResult.insertedId;

    // Start background processor WITHOUT blocking response
    analyzeRepositoryInBackground(repoId.toString(), githubUrl);

    return NextResponse.json({
      success: true,
      repositoryId: repoId.toString(),
      message: 'Analysis initiated successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to initiate analysis' }, { status: 500 });
  }
}

async function analyzeRepositoryInBackground(repoIdStr: string, githubUrl: string) {
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

    // Detect Frameworks & Package file details
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

    // Update repository statistics
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

    // 3. Parser AST (complexity + imports)
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
        content: file.content.slice(0, 100000), // Protect DB from huge codebases
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

    // 5. Run AI Agents in background
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
    };

    // Run AI agents in parallel/series
    const [arch, onboarding, techDebt, security, history] = await Promise.all([
      runArchitectureAgent(agentCtx).catch((e) => ({ error: e.message })),
      runOnboardingAgent(agentCtx).catch((e) => ({ error: e.message })),
      runTechDebtAgent(agentCtx).catch((e) => ({ error: e.message })),
      runSecurityAgent(agentCtx).catch((e) => ({ error: e.message })),
      runHistoryAgent(agentCtx).catch((e) => ({ error: e.message })),
    ]);

    // Save agent reports
    const reportDocs = [
      { repositoryId: repoId, agentType: 'architecture', content: arch, createdAt: new Date() },
      { repositoryId: repoId, agentType: 'onboarding', content: onboarding, createdAt: new Date() },
      { repositoryId: repoId, agentType: 'techDebt', content: techDebt, createdAt: new Date() },
      { repositoryId: repoId, agentType: 'security', content: security, createdAt: new Date() },
      { repositoryId: repoId, agentType: 'history', content: history, createdAt: new Date() },
    ];
    await db.collection('agentReports').insertMany(reportDocs);

    // Clean up temporary workspace directory
    await logStep('Finalizing files and cleaning up scratch disk...', 'finalizing', 90);
    cleanupRepoFolder(repoFolder);

    // Finalize
    await logStep('Analysis finalized successfully! Dashboard generated.', 'completed', 100);
  } catch (error: any) {
    console.error('Analysis failed', error);
    await logStep(`Analysis aborted: ${error.message || error}`, 'failed', 0);
    if (repoFolder) cleanupRepoFolder(repoFolder);
  }
}
