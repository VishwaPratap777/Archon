# Archon (Wamious) Project Workflow

## Overview
Archon is an AI-powered repository intelligence platform designed to analyze and summarize codebases. The project uses a Next.js frontend (`archon/`) for user interaction and visualization, and an Express.js backend (`backend/`) for processing, Git operations, and database interactions.

## Architecture & Workflow

### 1. Ingestion & Cloning
The workflow begins when a user inputs a GitHub repository URL into the frontend. 
- The **GitHub API** validates the repository.
- The **Backend Worker** executes local Git commands to clone the repository into a temporary workspace for analysis.

### 2. File Scanning & Parsing
- The system recursively scans the repository directory, filtering out common build output folders (like `node_modules` or `.git`).
- It determines the technical stack by inspecting files like `package.json`.
- **Tree-sitter AST Parsing**: Code files are parsed using Tree-sitter WebAssembly binaries to evaluate cyclomatic complexity, dependencies, and structure.

### 3. Graph Generation
- Import statements and module definitions are parsed to build a **Dependency Graph**.
- These connections are visualized in the frontend using circular node distributions to map architectural relationships.

### 4. Git History Analysis
- The backend runs raw Git log extraction commands to pull authors, commit history, and dates.
- This historical data helps identify development milestones and contributor patterns.

### 5. AI Summarization & Tech Debt Assessment
- Specialized LLM agents (Architect, Tech Lead, Auditor) analyze the extracted data and code chunks.
- They generate onboarding reading lists, map system architecture, and flag files with high cyclomatic complexity as "Technical Debt Hotspots."

### 6. Storage & Caching
- All metrics, AST analyses, and AI reports are persisted in a local **MongoDB** database.
- Future phases will introduce Redis caching for improved API latency and background job scheduling via BullMQ.
