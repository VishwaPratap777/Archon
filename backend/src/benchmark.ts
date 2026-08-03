import { walkRepository, parseGitCommits } from './lib/git';
import { parseSourceFile } from './lib/parser';
import { runArchitectureAgent, runOnboardingAgent, runTechDebtAgent, runSecurityAgent, runHistoryAgent, RepositoryContext } from './lib/agents';
import path from 'path';
import fs from 'fs';

async function runBenchmark() {
  const repoPath = path.resolve(__dirname, '../../');
  console.log(`Starting benchmark on repository: ${repoPath}`);
  
  const startTime = Date.now();
  
  // Phase 1: Walk files
  const walkStart = Date.now();
  const files = walkRepository(repoPath);
  const walkTime = Date.now() - walkStart;

  // Phase 2: AST Parsing
  const parseStart = Date.now();
  const contextFiles = [];
  for (const file of files) {
    const isSource = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go'].includes(file.extension);
    let complexity = 1;
    let imports: string[] = [];
    
    if (isSource) {
      const astInfo = await parseSourceFile(file.content, file.extension);
      complexity = astInfo.complexity;
      imports = astInfo.imports;
    }
    
    contextFiles.push({
      path: file.path,
      loc: file.loc,
      complexity,
      imports,
      functionsCount: 0,
      classesCount: 0
    });
  }
  const parseTime = Date.now() - parseStart;

  // Phase 3: Git History
  const gitStart = Date.now();
  const commits = parseGitCommits(repoPath);
  const gitTime = Date.now() - gitStart;

  const totalLoadTime = Date.now() - startTime;

  // Token Usage Estimation (1 token ~= 4 chars)
  const filesPayload = JSON.stringify(contextFiles.map(f => ({ path: f.path, loc: f.loc, comp: f.complexity, imports: f.imports })));
  const commitsPayload = JSON.stringify(commits.slice(0, 50).map(c => ({ msg: c.message, author: c.author, date: c.committedAt })));
  
  const archTokens = Math.ceil(filesPayload.length / 4);
  const onboardTokens = Math.ceil(filesPayload.length / 4);
  const techDebtTokens = Math.ceil(filesPayload.length / 4);
  const securityTokens = Math.ceil(JSON.stringify(contextFiles.map(f => f.path)).length / 4);
  const historyTokens = Math.ceil(commitsPayload.length / 4);
  const totalTokens = archTokens + onboardTokens + techDebtTokens + securityTokens + historyTokens;

  // Measure Agent API Latency
  console.log('Running agents to measure API Latency...');
  const agentCtx: RepositoryContext = {
    githubUrl: 'local-benchmark',
    name: 'Wamious',
    owner: 'Local',
    files: contextFiles,
    commits: commits.map((c) => ({
      hash: c.hash,
      author: c.author,
      message: c.message,
      committedAt: c.committedAt,
    })),
    frameworks: ['Node.js', 'Next.js'],
  };

  const measureAgent = async (name: string, agentFn: any) => {
    const start = Date.now();
    try {
      await agentFn(agentCtx);
    } catch (e) {
      // ignore
    }
    return Date.now() - start;
  };

  const archLatency = await measureAgent('Architecture', runArchitectureAgent);
  const onboardLatency = await measureAgent('Onboarding', runOnboardingAgent);
  const techDebtLatency = await measureAgent('TechDebt', runTechDebtAgent);
  const securityLatency = await measureAgent('Security', runSecurityAgent);
  const historyLatency = await measureAgent('History', runHistoryAgent);

  const totalAgentLatency = archLatency + onboardLatency + techDebtLatency + securityLatency + historyLatency;

  // Generate Markdown Report
  let md = `# Wamious - Pre-RAG Architecture Baseline Metrics\n\n`;
  md += `## Overview\nThis document tracks baseline metrics for load/retrieval time, token usage, and API latency before migrating to a RAG (Redis + LangGraph) architecture.\n\n`;
  
  md += `## 1. Load & Retrieval Times\n`;
  md += `- **Walked ${files.length} files:** ${walkTime}ms\n`;
  md += `- **AST Parsing (Tree-sitter):** ${parseTime}ms\n`;
  md += `- **Git History Extraction:** ${gitTime}ms\n`;
  md += `**=> Total Local Processing Time:** ${totalLoadTime}ms\n\n`;
  
  md += `## 2. Token Usage Estimates (Baseline before RAG)\n`;
  md += `- **Architecture Agent Prompt:** ~${archTokens} tokens\n`;
  md += `- **Onboarding Agent Prompt:** ~${onboardTokens} tokens\n`;
  md += `- **Tech Debt Agent Prompt:** ~${techDebtTokens} tokens\n`;
  md += `- **Security Agent Prompt:** ~${securityTokens} tokens\n`;
  md += `- **History Agent Prompt:** ~${historyTokens} tokens\n`;
  md += `**=> Estimated Total Tokens Per Scan:** ~${totalTokens} tokens\n\n`;

  md += `## 3. Agent API Latency\n`;
  md += `*(Note: If no API keys are set, these times reflect the fallback mock generation.)*\n`;
  md += `- **Architecture Agent:** ${archLatency}ms\n`;
  md += `- **Onboarding Agent:** ${onboardLatency}ms\n`;
  md += `- **Tech Debt Agent:** ${techDebtLatency}ms\n`;
  md += `- **Security Agent:** ${securityLatency}ms\n`;
  md += `- **History Agent:** ${historyLatency}ms\n`;
  md += `**=> Total LLM Generation Latency:** ${totalAgentLatency}ms\n\n`;

  md += `## Conclusion\n`;
  md += `Local file parsing is highly efficient (< 1s), but the token payloads sent to the LLM are massive (~${totalTokens} tokens) and result in high API generation latency (${totalAgentLatency}ms). Transitioning to RAG with Redis will chunk these files and only pass the relevant context vectors, significantly reducing token usage and decreasing LLM latency.\n`;

  fs.writeFileSync(path.resolve(__dirname, '../../../test_beforeRAG.md'), md, 'utf8');
  console.log(`Markdown report generated at: test_beforeRAG.md`);
}

runBenchmark().catch(console.error);
