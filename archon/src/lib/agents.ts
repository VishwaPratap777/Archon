import { getSettings } from './db';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

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
}

// Global helper to invoke LLM
async function callLLM(prompt: string, systemPrompt: string): Promise<string> {
  const settings: any = await getSettings();
  
  // 1. Try Groq (Llama 3.3) as primary
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
      return completion.choices[0].message.content || '{}';
    } catch (err) {
      console.error('Groq API Call Failed, trying Anthropic fallback...', err);
    }
  }

  // 2. Try Anthropic (Claude)
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
      if (contentBlock && contentBlock.type === 'text') {
        return contentBlock.text;
      }
    } catch (err) {
      console.error('Anthropic API Call Failed, trying OpenAI fallback...', err);
    }
  }

  // 3. Try OpenAI
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
      return completion.choices[0].message.content || '{}';
    } catch (err) {
      console.error('OpenAI API Call Failed:', err);
    }
  }

  throw new Error('No API keys configured. Set them in the Settings page.');
}

// 1. Architecture Agent
export async function runArchitectureAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are a Principal Software Architect. Analyze the repository structure and import paths to synthesize system design insights. Return a JSON object with:
  {
    "summary": "High level architecture style description",
    "layers": ["Layer name 1: description", "Layer name 2: description"],
    "circularDependencies": ["Warning/details of circular imports"],
    "designPatterns": ["List of patterns detected (e.g. Singleton, MVC, Repository)"],
    "recommendations": ["Architectural improvement advice"]
  }`;

  const prompt = `Here is the codebase structure for "${ctx.name}":
  Frameworks detected: ${ctx.frameworks.join(', ')}
  Files metadata (path, loc, complexity, imports):
  ${JSON.stringify(ctx.files.map(f => ({ path: f.path, loc: f.loc, comp: f.complexity, imports: f.imports })), null, 2)}
  
  Generate architecture assessment. Return ONLY clean JSON matching the requested structure.`;

  try {
    const raw = await callLLM(prompt, systemPrompt);
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Falling back to mock Architecture assessment', e);
    // Generate deterministic mock architecture
    const entryPoints = ctx.files.filter(f => f.path.match(/(index|server|app|main)\.(ts|js|go|py)$/i)).map(f => f.path);
    return {
      summary: `A ${ctx.frameworks[0] || 'Node.js'} based repository structured with modular layers. Key entry point is likely ${entryPoints[0] || 'main file'}.`,
      layers: [
        `Entry layer: Coordinates startup, configurations, and exports. Includes ${entryPoints.join(', ') || 'root files'}.`,
        `Core logic: Houses utilities and service modules, parsed with average code complexity of ${(ctx.files.reduce((a,b)=>a+b.complexity, 0)/Math.max(ctx.files.length, 1)).toFixed(1)}.`
      ],
      circularDependencies: detectCircularDependenciesMock(ctx.files),
      designPatterns: ctx.frameworks.includes('Next.js') ? ['React App Router Architecture', 'Server Actions / API Handlers'] : ['Modular Functional Architecture'],
      recommendations: ['Keep complexity low by refactoring long modules (>150 LOC)', 'Ensure logical isolation between entry components and utilities.']
    };
  }
}

// 2. Onboarding Agent
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
    const raw = await callLLM(prompt, systemPrompt);
    return JSON.parse(raw);
  } catch (e) {
    // Generate deterministic mock onboarding list
    const sorted = [...ctx.files].sort((a,b) => b.loc - a.loc); // large/important files
    const readme = ctx.files.find(f => f.path.toLowerCase() === 'readme.md');
    
    const list = [];
    if (readme) {
      list.push({ path: readme.path, priority: 'High', reason: 'Official repository documentation and configuration setup instructions.' });
    }
    
    // Pick the most complex/top files
    sorted.slice(0, 3).forEach(f => {
      if (f.path.toLowerCase() !== 'readme.md') {
        list.push({ path: f.path, priority: 'Medium', reason: `Main logic container with ${f.loc} lines of code and ${f.complexity} complexity index.` });
      }
    });

    return {
      readingList: list,
      setupSteps: [
        'Read README.md to configure local environment variables.',
        ctx.frameworks.includes('Next.js') ? 'Run npm install followed by npm run dev.' : 'Install default project dependencies.'
      ],
      architectureTips: [
        'Start at the entry points and trace import streams outward.',
        'Review complexity scores to find core processing components.'
      ]
    };
  }
}

// 3. Technical Debt Agent
export async function runTechDebtAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are an engineering quality auditor. Review codebase metrics and imports to flag technical debt. Return a JSON object with:
  {
    "complexityRatio": 0.85, // score 0-1, lower is better debt
    "hotspots": [
      { "path": "file path", "metric": "Reason e.g. High Complexity (24) & LOC (400)", "impact": "Why it matters", "refactoringStep": "Actionable refactor step" }
    ],
    "deadCodeOpportunities": ["Check exports and dead dependencies descriptions"],
    "generalRecommendations": ["Actionable items"]
  }`;

  const prompt = `Codebase metrics data:
  Files: ${JSON.stringify(ctx.files.map(f => ({ path: f.path, loc: f.loc, complexity: f.complexity, importsCount: f.imports.length })), null, 2)}
  
  Generate technical debt audit. Return ONLY JSON.`;

  try {
    const raw = await callLLM(prompt, systemPrompt);
    return JSON.parse(raw);
  } catch (e) {
    // Generate deterministic mock tech debt
    const hotspots = ctx.files
      .filter(f => f.complexity > 8 || f.loc > 250)
      .slice(0, 3)
      .map(f => ({
        path: f.path,
        metric: `Complexity: ${f.complexity}, Lines of Code: ${f.loc}`,
        impact: 'High complexity increases cognitive overload during edits and increases defect probability.',
        refactoringStep: 'Extract utility functions and break down giant conditional blocks.'
      }));

    return {
      complexityRatio: hotspots.length > 0 ? 0.7 : 0.25,
      hotspots,
      deadCodeOpportunities: ctx.files.length > 10 ? ['Check functions in large modules that are never referenced in import lists.'] : ['No obvious dead modules found.'],
      generalRecommendations: [
        'Implement automated tests for modules exceeding a complexity index of 10.',
        'Refactor files exceeding 250 lines of code.'
      ]
    };
  }
}

// 4. Security Agent
export async function runSecurityAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are a security auditor. Inspect file paths and dependencies for vulnerabilities. Return a JSON object with:
  {
    "vulnerabilities": [
      { "severity": "High/Medium/Low", "category": "Category", "description": "Details", "mitigation": "How to fix" }
    ],
    "bestPracticesAdherence": ["Security best practices recommendations"]
  }`;

  const prompt = `Codebase details:
  Frameworks: ${ctx.frameworks.join(', ')}
  File extensions and imports:
  ${JSON.stringify(ctx.files.map(f => ({ path: f.path, ext: f.path.split('.').pop() })), null, 2)}
  
  Inspect for security concerns. Return ONLY JSON.`;

  try {
    const raw = await callLLM(prompt, systemPrompt);
    return JSON.parse(raw);
  } catch (e) {
    const vulns = [];
    
    // Deterministic checks
    const hasEnvTemplate = ctx.files.some(f => f.path.includes('env'));
    if (!hasEnvTemplate && ctx.files.length > 0) {
      vulns.push({
        severity: 'Medium',
        category: 'Information Disclosure',
        description: 'Missing env template file (.env.example or template.env) for environment parameter setups.',
        mitigation: 'Add an obfuscated .env.example template to Git to prevent devs committing live keys.'
      });
    }

    return {
      vulnerabilities: vulns,
      bestPracticesAdherence: [
        'Sanitize inputs before invoking exec/system calls.',
        'Update package locks regularly to audit nested package dependencies.'
      ]
    };
  }
}

// 5. History / Story Agent
export async function runHistoryAgent(ctx: RepositoryContext): Promise<any> {
  const systemPrompt = `You are a software historian. Group the Git commit messages chronologically into themes (e.g., authentication, refactors, dependencies) and write a timeline narrative explaining how the codebase evolved. Return a JSON object with:
  {
    "timeline": [
      { "theme": "Theme title", "timePeriod": "Period string", "explanation": "Why changes happened", "affectedFiles": ["Relative paths"] }
    ],
    "evolutionSummary": "Short narrative of codebase progress"
  }`;

  const prompt = `Here are the latest commits:
  ${JSON.stringify(ctx.commits, null, 2)}
  
  Generate repository story timeline. Return ONLY JSON.`;

  try {
    const raw = await callLLM(prompt, systemPrompt);
    return JSON.parse(raw);
  } catch (e) {
    // Generate deterministic mock story
    const themes: Record<string, string[]> = {
      'Initial Setup': [],
      'Code Refactoring': [],
      'Feature Updates': []
    };

    ctx.commits.forEach(c => {
      const msg = c.message.toLowerCase();
      if (msg.includes('init') || msg.includes('setup') || msg.includes('first commit')) {
        themes['Initial Setup'].push(c.message);
      } else if (msg.includes('refactor') || msg.includes('clean') || msg.includes('fix')) {
        themes['Code Refactoring'].push(c.message);
      } else {
        themes['Feature Updates'].push(c.message);
      }
    });

    const timeline = Object.entries(themes)
      .filter(([_, list]) => list.length > 0)
      .map(([theme, list]) => ({
        theme,
        timePeriod: 'Recent commits',
        explanation: `Changes relating to: ${list.slice(0, 2).join(', ')}.`,
        affectedFiles: ctx.files.slice(0, 2).map(f => f.path)
      }));

    return {
      timeline,
      evolutionSummary: `Codebase evolution spanning ${ctx.commits.length} commits. Development focuses primarily on initial initialization and modular layout setup.`
    };
  }
}

// Utility to mock circular dependency path detection
function detectCircularDependenciesMock(files: RepositoryContext['files']): string[] {
  const warnings: string[] = [];
  const fileMap = new Map<string, string[]>();
  
  // Populate imports map
  files.forEach(f => {
    // simple normalization of imports to try and match paths
    const resolved = f.imports.map(imp => {
      const cleaned = imp.replace(/^\.\//, '').replace(/^\.\.\//, '');
      return cleaned;
    });
    fileMap.set(f.path, resolved);
  });

  // Basic check for A imports B and B imports A
  for (const [pathA, importsA] of fileMap.entries()) {
    for (const impB of importsA) {
      // Try to find if impB matches another file in our list
      const matchedFile = files.find(f => f.path.includes(impB));
      if (matchedFile && matchedFile.path !== pathA) {
        const importsB = fileMap.get(matchedFile.path) || [];
        if (importsB.some(impA => pathA.includes(impA))) {
          warnings.push(`Circular Dependency: [${pathA}] <---> [${matchedFile.path}]`);
        }
      }
    }
  }

  return Array.from(new Set(warnings)).slice(0, 3); // Max 3 logs
}
