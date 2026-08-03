import { getSettings } from './db';
import { trackTokenUsage } from './auth';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { StateGraph, END } from "@langchain/langgraph";
import { retrieveRelevantChunks } from './rag';

export interface RepositoryContext {
  githubUrl: string;
  name: string;
  owner: string;
  files: Array<{
    path: string;
    loc: number;
    complexity: number;
    imports: string[];
    functionsCount: number;
    classesCount: number;
  }>;
  commits: Array<{
    hash: string;
    author: string;
    message: string;
    committedAt: Date;
  }>;
  frameworks: string[];
  userId?: string;
  repositoryId?: string;
}

export interface LlmResult {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
  };
}

async function callLLM(prompt: string, systemPrompt: string): Promise<LlmResult> {
  const settings: any = await getSettings();
  
  const groqKey = settings.groqApiKey || process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const client = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const completion = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;
      const totalTokens = completion.usage?.total_tokens || (promptTokens + completionTokens);
      return {
        text: completion.choices[0].message.content || '{}',
        usage: { promptTokens, completionTokens, totalTokens, model: 'llama-3.3-70b-versatile' }
      };
    } catch (err) {
      console.error('Groq API Call Failed, trying Anthropic fallback...', err);
    }
  }

  const anthropicKey = settings.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      });
      const contentBlock = message.content[0];
      const text = contentBlock && contentBlock.type === 'text' ? contentBlock.text : '{}';
      const promptTokens = message.usage?.input_tokens || 0;
      const completionTokens = message.usage?.output_tokens || 0;
      const totalTokens = promptTokens + completionTokens;
      return {
        text,
        usage: { promptTokens, completionTokens, totalTokens, model: 'claude-3-5-sonnet-20241022' }
      };
    } catch (err) {
      console.error('Anthropic API Call Failed, trying OpenAI fallback...', err);
    }
  }

  const openaiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;
      const totalTokens = completion.usage?.total_tokens || (promptTokens + completionTokens);
      return {
        text: completion.choices[0].message.content || '{}',
        usage: { promptTokens, completionTokens, totalTokens, model: 'gpt-4o-mini' }
      };
    } catch (err) {
      console.error('OpenAI API Call Failed:', err);
    }
  }

  throw new Error('No API keys configured. Set them in the Settings page.');
}

export async function runArchitectureAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are an expert software architect.

Below are structured summaries of every file in a repository.

Your task is to build a complete understanding of the project.

Produce ONLY valid JSON.

{
  "project_name": "",
  "description": "",

  "tech_stack": [],

  "frontend": {
    "framework": "",
    "routing": "",
    "state_management": [],
    "ui": []
  },

  "backend": {
    "framework": "",
    "architecture": "",
    "api_style": ""
  },

  "authentication": {
    "provider": "",
    "how_it_works": ""
  },

  "database": {
    "provider": "",
    "orm": "",
    "main_models": []
  },

  "external_services": [],

  "caching": [],

  "queueing": [],

  "ai_services": [],

  "major_features": [],

  "folder_purposes": {
    "/app": "",
    "/components": "",
    "/lib": "",
    "/api": ""
  },

  "important_files": [
    {
      "path": "",
      "reason": ""
    }
  ],

  "architecture_summary": "",

  "developer_notes": [
    "...",
    "..."
  ]
}`;

  const prompt = `Here is the codebase structure for "${ctx.name}":
  Frameworks detected: ${ctx.frameworks.join(', ')}
  Files metadata (path, loc, complexity, imports):
  ${JSON.stringify(ctx.files.map(f => ({ path: f.path, loc: f.loc, comp: f.complexity, imports: f.imports })), null, 2)}
  
  Generate architecture assessment. Return ONLY clean JSON matching the requested structure.`;

  try {
    const res = await callLLM(prompt, systemPrompt);
    if (ctx.userId) {
      await trackTokenUsage({
        userId: ctx.userId,
        agentType: 'architecture',
        ...res.usage,
        repositoryId: ctx.repositoryId,
      });
    }
    return JSON.parse(res.text);
  } catch (e) {
    console.warn('Falling back to mock Architecture assessment', e);
    const entryPoints = ctx.files.filter(f => f.path.match(/(index|server|app|main)\.(ts|js|go|py)$/i)).map(f => f.path);
    return {
      project_name: ctx.name,
      description: `A ${ctx.frameworks[0] || 'Node.js'} based repository. Entry point is likely ${entryPoints[0] || 'main file'}.`,
      tech_stack: ctx.frameworks,
      frontend: {
        framework: ctx.frameworks.includes('Next.js') ? 'Next.js' : (ctx.frameworks.includes('React') ? 'React' : 'Unknown'),
        routing: 'Unknown',
        state_management: [],
        ui: []
      },
      backend: {
        framework: 'Unknown',
        architecture: 'Modular Functional Architecture',
        api_style: 'REST/Unknown'
      },
      authentication: { provider: 'None', how_it_works: 'N/A' },
      database: { provider: 'None', orm: 'None', main_models: [] },
      external_services: [],
      caching: [],
      queueing: [],
      ai_services: [],
      major_features: [],
      folder_purposes: {},
      important_files: entryPoints.map(p => ({ path: p, reason: 'Entry point of the application' })),
      architecture_summary: `Average code complexity of ${(ctx.files.reduce((a,b)=>a+b.complexity, 0)/Math.max(ctx.files.length, 1)).toFixed(1)}.`,
      developer_notes: [
        'Keep complexity low by refactoring long modules (>150 LOC)',
        'Ensure logical isolation between entry components and utilities.'
      ]
    };
  }
}

export async function runOnboardingAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are a Tech Lead onboarding a new junior engineer. Recommend which files they should read first to understand the codebase. Return a JSON object with:
  {
    "readingList": [
      { "path": "file path", "priority": "High/Medium/Low", "reason": "Why this file is important" }
    ],
    "setupSteps": ["List of command/steps to set up"],
    "architectureTips": ["Tips to debug and navigate the project structure"]
  }`;

  const prompt = `Here is the codebase context:
  Files: ${JSON.stringify(ctx.files.map(f => ({ path: f.path, loc: f.loc })), null, 2)}
  Frameworks: ${ctx.frameworks.join(', ')}
  
  Develop the onboarding paths. Return ONLY JSON matching the requested structure.`;

  try {
    const res = await callLLM(prompt, systemPrompt);
    if (ctx.userId) {
      await trackTokenUsage({
        userId: ctx.userId,
        agentType: 'onboarding',
        ...res.usage,
        repositoryId: ctx.repositoryId,
      });
    }
    return JSON.parse(res.text);
  } catch (e) {
    const sorted = [...ctx.files].sort((a,b) => b.loc - a.loc);
    const readme = ctx.files.find(f => f.path.toLowerCase() === 'readme.md');
    
    const list = [];
    if (readme) {
      list.push({ path: readme.path, priority: 'High', reason: 'Official repository documentation and configuration setup instructions.' });
    }
    
    sorted.slice(0, 3).forEach(f => {
      if (f.path.toLowerCase() !== 'readme.md') {
        list.push({ path: f.path, priority: 'Medium', reason: `Main logic container with ${f.loc} lines of code and ${f.complexity} complexity index.` });
      }
    });

    return {
      readingList: list,
      setupSteps: ctx.frameworks.includes('Next.js') ? ['npm install', 'npm run dev'] : ['npm install', 'npm start'],
      architectureTips: [
        'Explore entry files first to identify core lifecycle triggers.',
        'Review shared utility folders to reuse cross-module functions.'
      ]
    };
  }
}

export async function runTechDebtAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are a Senior Staff Engineer assessing technical debt. Scan files for code quality issues and recommend refactoring targets. Return a JSON object with:
  {
    "complexityRatio": 0.65, // float from 0 to 1, where 1 = worst debt
    "hotspots": [
      {
        "path": "file path",
        "metric": "Cyclomatic Complexity: 18",
        "impact": "Why this file is a problem and its architectural impact",
        "refactoringStep": "Concrete step to reduce complexity"
      }
    ],
    "generalRecommendations": ["Specific code quality recommendation"],
    "deadCodeOpportunities": ["File or module that appears unused or redundant"]
  }`;

  const prompt = `Here is the codebase context:
  Files: ${JSON.stringify(ctx.files.map(f => ({ path: f.path, complexity: f.complexity, loc: f.loc })), null, 2)}
  
  Assess technical debt. Return ONLY JSON matching the requested structure.`;

  try {
    const res = await callLLM(prompt, systemPrompt);
    if (ctx.userId) {
      await trackTokenUsage({
        userId: ctx.userId,
        agentType: 'techDebt',
        ...res.usage,
        repositoryId: ctx.repositoryId,
      });
    }
    return JSON.parse(res.text);
  } catch (e) {
    const sortedByComplexity = [...ctx.files].sort((a,b) => b.complexity - a.complexity);
    const avgComp = ctx.files.reduce((a,b)=>a+b.complexity,0) / Math.max(ctx.files.length, 1);
    const complexityRatio = Math.min(Math.max(avgComp / 20, 0.05), 1);

    const hotspots = sortedByComplexity.slice(0, 4).map(f => ({
      path: f.path,
      metric: `Cyclomatic Complexity: ${f.complexity}`,
      impact: f.complexity > 10
        ? `High branching density makes this file difficult to test and maintain. Bug surface area is large.`
        : `Moderate complexity — monitor as the module grows to prevent debt accumulation.`,
      refactoringStep: f.complexity > 10
        ? 'Extract nested conditionals into named helper functions and add unit tests per branch.'
        : 'Maintain current structure; set a complexity budget of 8 per function.'
    }));

    const deadCodeOpportunities = ctx.files
      .filter(f => f.loc < 15 && !f.path.match(/(index|d\.ts|types|constants)/i))
      .slice(0, 4)
      .map(f => `${f.path} (${f.loc} LOC — likely a stub or placeholder)`);

    const circularWarnings = detectCircularDependenciesMock(ctx.files);

    return {
      complexityRatio: parseFloat(complexityRatio.toFixed(2)),
      hotspots,
      generalRecommendations: [
        'Keep average cyclomatic complexity below 8 per function to improve testability.',
        'Enforce ESLint max-complexity rule at CI level to catch regressions early.',
        circularWarnings.length > 0
          ? `Resolve ${circularWarnings.length} circular import(s) to improve tree-shaking efficiency.`
          : 'No circular imports detected — maintain strict module boundaries.',
        'Consolidate duplicate utility functions across modules into a shared lib folder.',
      ],
      deadCodeOpportunities: deadCodeOpportunities.length > 0
        ? deadCodeOpportunities
        : ['No obvious dead code patterns detected from static file analysis.']
    };
  }
}

export async function runSecurityAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are a Security Auditor. Scan file paths and descriptions for vulnerabilities, hardcoded secret patterns, and security risks. Return a JSON object with:
  {
    "vulnerabilities": [
      {
        "severity": "High/Medium/Low",
        "category": "Short vulnerability category name (e.g. Injection, Secrets Exposure)",
        "description": "Detailed vulnerability description",
        "mitigation": "Concrete step to fix or mitigate the vulnerability"
      }
    ],
    "bestPracticesAdherence": ["Security best practice the project follows or should follow"]
  }`;

  const prompt = `Here is the codebase context:
  Frameworks: ${ctx.frameworks.join(', ')}
  File paths: ${JSON.stringify(ctx.files.map(f => f.path))}
  
  Perform security scan. Return ONLY JSON matching the requested structure.`;

  try {
    const res = await callLLM(prompt, systemPrompt);
    if (ctx.userId) {
      await trackTokenUsage({
        userId: ctx.userId,
        agentType: 'security',
        ...res.usage,
        repositoryId: ctx.repositoryId,
      });
    }
    return JSON.parse(res.text);
  } catch (e) {
    const vulnerabilities: any[] = [];
    const secretFiles: string[] = [];

    ctx.files.forEach(f => {
      if (f.path.match(/\.env|secret|credential|apikey|private/i)) {
        secretFiles.push(f.path);
      }
    });

    if (secretFiles.length > 0) {
      vulnerabilities.push({
        severity: 'High',
        category: 'Secrets Exposure',
        description: `Detected ${secretFiles.length} file(s) with names matching credential patterns: ${secretFiles.slice(0,3).join(', ')}.`,
        mitigation: 'Add all secret files to .gitignore. Use environment variables injected at runtime, never committed to source.'
      });
    }

    // Check for common risky patterns
    const hasNodeEnv = ctx.files.some(f => f.path.includes('server') || f.path.includes('api'));
    if (hasNodeEnv) {
      vulnerabilities.push({
        severity: 'Medium',
        category: 'Input Validation',
        description: 'Server-side endpoints detected. Without input validation, user-supplied data may cause injection vulnerabilities.',
        mitigation: 'Validate and sanitize all incoming request bodies and query parameters using a schema validator (e.g. Zod, Joi).'
      });
    }

    if (vulnerabilities.length === 0) {
      vulnerabilities.push({
        severity: 'Low',
        category: 'General',
        description: 'No high-priority vulnerabilities matched in static file path analysis.',
        mitigation: 'Run `npm audit` regularly and pin dependency versions in package.json.'
      });
    }

    const bestPracticesAdherence = [
      ctx.frameworks.includes('Next.js') ? 'Next.js App Router provides built-in CSRF protection for server actions.' : 'Implement CSRF tokens on state-changing endpoints.',
      'Use HTTPS exclusively for all outbound API calls and external resource loading.',
      'Run npm audit in CI pipeline to catch known dependency vulnerabilities before merge.',
      'Implement Content Security Policy (CSP) headers to mitigate XSS attack vectors.',
      'Rate-limit sensitive endpoints (authentication, password reset) to prevent brute force attacks.',
    ];

    return { vulnerabilities, bestPracticesAdherence };
  }
}

export async function runHistoryAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are a Git Historian. Analyze the commit messages and author patterns to reconstruct the codebase evolution story. Return a JSON object with:
  {
    "evolutionSummary": "A one-paragraph narrative of how the project evolved, its major pivots and growth phases",
    "timeline": [
      {
        "theme": "Short descriptive phase name (e.g. Initial Foundation, Auth Overhaul)",
        "timePeriod": "Month Year or date range string",
        "explanation": "What architectural changes happened in this phase and why it mattered",
        "affectedFiles": ["file/path.ts"]
      }
    ]
  }`;

  const prompt = `Here are the latest git commits for repository "${ctx.name}":
  ${JSON.stringify(ctx.commits.slice(0, 50).map(c => ({ msg: c.message, author: c.author, date: c.committedAt })), null, 2)}
  
  Reconstruct the project story with timeline phases. Return ONLY JSON matching the requested structure.`;

  try {
    const res = await callLLM(prompt, systemPrompt);
    if (ctx.userId) {
      await trackTokenUsage({
        userId: ctx.userId,
        agentType: 'history',
        ...res.usage,
        repositoryId: ctx.repositoryId,
      });
    }
    return JSON.parse(res.text);
  } catch (e) {
    // Build a heuristic timeline from commit messages
    const authors = [...new Set(ctx.commits.map(c => c.author))];
    const totalCommits = ctx.commits.length;

    // Group commits into rough phases by recency
    const chunkSize = Math.max(1, Math.floor(totalCommits / 4));
    const phases: any[] = [];
    const phaseNames = ['Foundation & Setup', 'Core Feature Development', 'Integration & Stabilization', 'Polish & Optimization'];

    for (let i = 0; i < 4 && i * chunkSize < totalCommits; i++) {
      const slice = ctx.commits.slice(i * chunkSize, (i + 1) * chunkSize);
      if (slice.length === 0) continue;
      const firstDate = new Date(slice[slice.length - 1].committedAt);
      const lastDate = new Date(slice[0].committedAt);
      const dateRange = firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      // Detect most common keywords in this phase
      const messages = slice.map(c => c.message.toLowerCase()).join(' ');
      const hasAuth = messages.includes('auth') || messages.includes('login');
      const hasDB = messages.includes('db') || messages.includes('mongo') || messages.includes('model');
      const hasFix = messages.includes('fix') || messages.includes('bug') || messages.includes('patch');
      const hasFeature = messages.includes('feat') || messages.includes('add') || messages.includes('implement');

      const explanation = [
        hasFeature ? `${slice.length} feature commits drove major capability additions.` : '',
        hasAuth ? 'Authentication and access control were a primary concern in this phase.' : '',
        hasDB ? 'Data persistence and schema design were established or evolved.' : '',
        hasFix ? 'Significant bug-fixing activity indicates stabilization work.' : '',
        `${authors.length} contributor(s) drove this phase.`,
      ].filter(Boolean).join(' ');

      phases.push({
        theme: phaseNames[i] || `Phase ${i + 1}`,
        timePeriod: dateRange,
        explanation: explanation || `${slice.length} commits during this phase shaped the codebase structure.`,
        affectedFiles: []
      });
    }

    const entryFiles = ctx.files
      .filter(f => f.path.match(/(index|server|app|main)\.(ts|js|go|py)$/i))
      .map(f => f.path);

    return {
      evolutionSummary: `"${ctx.name}" is a ${ctx.frameworks[0] || 'software'} project with ${totalCommits} commits from ${authors.length} contributor(s). The codebase has grown through distinct phases from initial setup through active feature development, accumulating ${ctx.files.length} parsed source files and ${ctx.files.reduce((a,b)=>a+b.loc,0).toLocaleString()} lines of code. Key entry points include: ${entryFiles.slice(0,2).join(', ') || 'root modules'}.`,
      timeline: phases.length > 0 ? phases : [{
        theme: 'Active Development',
        timePeriod: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        explanation: 'Repository is under active development. Commit history will grow more descriptive over time.',
        affectedFiles: []
      }]
    };
  }
}
export async function runChatAgent(ctx: RepositoryContext, query: string): Promise<any> {
  const systemPrompt = `You are a repository expert.

You have access to:
1. Repository architecture summary
2. Folder summaries
3. File summaries
4. Retrieved source code
5. AST metadata

When answering:
- Prefer repository facts over guessing.
- Combine information from multiple files when needed.
- Mention the exact files supporting your answer.
- If authentication/database/API logic spans multiple files, explain how they connect.
- Never hallucinate missing code.
- If the repository does not contain enough evidence, explicitly say so.
- When possible, include file paths, exported functions, components, and important dependencies.

CRITICAL FORMATTING INSTRUCTION:
Return ONLY a valid JSON object with the following structure:
  {
    "answer": "Your detailed answer to the user's question, formatted in markdown."
  }`;

  interface AgentState {
    query: string;
    context: string;
    answer: string;
    usage?: any;
  }

  // 1. Define nodes
  const retrieveNode = async (state: AgentState) => {
    console.log('[LangGraph] Retrieving context for:', state.query);
    const retrievedDocs = await retrieveRelevantChunks(ctx.repositoryId || '', state.query, 5);
    return { context: retrievedDocs };
  };

  const generateNode = async (state: AgentState) => {
    console.log('[LangGraph] Generating answer based on context...');
    const prompt = `Here is the codebase metadata for "${ctx.name}":
Frameworks: ${ctx.frameworks.join(', ')}
Files metadata:
${JSON.stringify(ctx.files.slice(0, 50).map(f => ({ path: f.path, loc: f.loc })), null, 2)}

--- RETRIEVED CODE CONTEXT ---
${state.context}
------------------------------

User Query: "${state.query}"

Respond to the query using ONLY the provided metadata and retrieved code context. Return ONLY JSON matching the requested structure.`;

    const res = await callLLM(prompt, systemPrompt);
    return { 
      answer: res.text,
      usage: res.usage
    };
  };

  // 2. Build the graph
  const graph = new StateGraph<AgentState>({
    channels: {
      query: { value: (x, y) => y ?? x, default: () => "" },
      context: { value: (x, y) => y ?? x, default: () => "" },
      answer: { value: (x, y) => y ?? x, default: () => "" },
      usage: { value: (x, y) => y ?? x, default: () => null }
    }
  })
    .addNode("retrieve", retrieveNode)
    .addNode("generate", generateNode)
    .addEdge("retrieve", "generate")
    .addEdge("generate", END);
    
  graph.setEntryPoint("retrieve");
  
  const app = graph.compile();

  try {
    const finalState = await app.invoke({ query, context: "", answer: "" });
    
    if (ctx.userId && finalState.usage) {
      await trackTokenUsage({
        userId: ctx.userId,
        agentType: 'chat',
        promptTokens: (finalState.usage as any).promptTokens || 0,
        completionTokens: (finalState.usage as any).completionTokens || 0,
        totalTokens: (finalState.usage as any).totalTokens || 0,
        model: (finalState.usage as any).model || 'unknown',
        repositoryId: ctx.repositoryId,
      });
    }
    return JSON.parse(finalState.answer as string);
  } catch (e: any) {
    console.error('[LangGraph Error]', e);
    return {
      answer: `Error executing LangGraph Chat Agent: ${e.message}`
    };
  }
}

// Helpers
function detectCircularDependenciesMock(files: any[]): string[] {
  const warnings: string[] = [];
  const map: Record<string, string[]> = {};
  files.forEach(f => {
    map[f.path] = f.imports || [];
  });
  
  // Basic mock check: if path A imports B and B imports A
  for (const file of files) {
    const imports = map[file.path] || [];
    for (const imp of imports) {
      // Find matches where imported name is a suffix of a file path
      const matchedFile = files.find(f => f.path.endsWith(imp) || f.path.endsWith(imp + '.ts') || f.path.endsWith(imp + '.tsx') || f.path.endsWith(imp + '.js'));
      if (matchedFile) {
        const backImports = map[matchedFile.path] || [];
        if (backImports.some(bi => file.path.endsWith(bi) || file.path.endsWith(bi.replace(/\.(ts|js|tsx)$/, '')))) {
          const msg = `Circular import candidate detected: ${file.path} <--> ${matchedFile.path}`;
          if (!warnings.includes(msg) && !warnings.includes(`Circular import candidate detected: ${matchedFile.path} <--> ${file.path}`)) {
            warnings.push(msg);
          }
        }
      }
    }
  }

  return warnings;
}
