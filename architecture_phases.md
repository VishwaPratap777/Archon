# ΛRCHON - Architecture Implementation Phases

This document provides a comprehensive breakdown of the architecture implementation phases for **Archon - AI-Powered Repository Intelligence Platform**. It charts what has been accomplished, details the underlying technical details of completed phases, and outlines concrete steps for the upcoming milestones.

---

## Roadmap Overview

```mermaid
gantt
    title Archon Project Roadmap & Phase Status
    dateFormat  YYYY-MM-DD
    section Completed
    Phase 1: UI & Product Front-End           :active, p1, 2026-07-01, 2026-07-08
    Phase 2: GitHub API integration           :active, p2, 2026-07-08, 2026-07-10
    Phase 3: Clone Repositories               :active, p3, 2026-07-10, 2026-07-11
    Phase 4: File Scanner                     :active, p4, 2026-07-11, 2026-07-12
    Phase 5: Dependency Graph Generator       :active, p5, 2026-07-12, 2026-07-13
    Phase 6: AI Summary Generation            :active, p6, 2026-07-13, 2026-07-15
    Phase 8: Tree-sitter AST Parsing          :active, p8, 2026-07-15, 2026-07-16
    Phase 9: Git History Extractor            :active, p9, 2026-07-16, 2026-07-17
    Phase 11: MongoDB Database                :active, p11, 2026-07-17, 2026-07-18
    Phase 13: Technical Debt Assessor         :active, p13, 2026-07-18, 2026-07-19
    Phase 14: Specialized AI Agents           :active, p14, 2026-07-19, 2026-07-20
    section Ongoing / Upcoming
    Phase 15: UI Polish                       :active, p15, 2026-07-20, 2026-07-22
    Phase 7: Chat with Repository             :after p14, p7, 2026-07-22, 5d
    Phase 10: Issues & PRs Tracker            :after p7, p10, 2026-07-27, 4d
    Phase 12: Multi-Tenant Auth               :after p10, p12, 2026-07-31, 5d
    Phase 16: Redis Caching Layer             :after p12, p16, 2026-08-05, 3d
    Phase 17: BullMQ Background Processor     :after p16, p17, 2026-08-08, 4d
    Phase 18: PostgreSQL Migration (Opt)      :after p17, p18, 2026-08-12, 5d
    Phase 19: Production & Scaling            :after p18, p19, 2026-08-17, 7d
```

---

## Detailed Phase Status

### Phase 1: UI & Product
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Configured a responsive, modern Next.js client application with a TailwindCSS design system.
  - Implemented glassmorphic dark-mode aesthetics using premium fonts, customized scrollbars, and standard utility tokens in [`globals.css`](file:///c:/Users/Witbix/Gitkit/archon/src/app/globals.css).
  - Developed custom views:
    - **Landing Page:** Interactive features like [`HoldToUnlock`](file:///c:/Users/Witbix/Gitkit/archon/src/components/sections/HoldToUnlock.tsx), a live typing terminal demo ([`ConsoleDemo`](file:///c:/Users/Witbix/Gitkit/archon/src/components/sections/ConsoleDemo.tsx)), and visual feature showcases.
    - **Dashboard:** Listing scanned repositories and status metrics.
    - **Repository Workspace:** An interactive tab panel layout housing the dependency graph, onboarding timelines, technical debt reports, and security audits.
    - **Settings Form:** For key provisioning and database reset configurations.

### Phase 2: GitHub API Integration
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Implemented repository URL checking and parser validation in [`git.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/lib/git.ts#L8-L38) to extract GitHub owner and names.
  - Provided settings inputs for GitHub Personal Access Tokens (PAT) stored inside local configuration tables to bypass strict API rate limiting when parsing directories or scanning tags.

### Phase 3: Clone Repositories
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Implemented automated repo cloning in [`git.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/lib/git.ts#L40-L70).
  - Dynamically constructs git command triggers injecting the developer’s local PAT credentials (if provided) to clone public or private targets.
  - Includes a self-cleaning sandbox cleanup function (`cleanupRepoFolder`) to delete checked-out workspaces from local directories once parsed.

### Phase 4: File Scanner
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Designed local directory walks in [`git.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/lib/git.ts#L72-L113) that read directory trees recursively.
  - Automatically filters out common workspace files and folders (e.g. `node_modules`, `.git`, lock files, static image resources).
  - Inspects file sizes, file extensions, and LOC (lines of code).
  - Scans configuration scopes (like `package.json`) to auto-detect framework stacks (e.g. Next.js, Express, React, Go, Python, TailwindCSS).

### Phase 5: Dependency Graph
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Resolved relative and alias import lines from codebase source files.
  - Formulates React Flow node coordinates on a circular distribution model in [`server.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/server.ts#L133-L160) to visualize architecture systems.
  - Dynamically builds animation links (edges) linking matching files together, allowing deep-dive architecture inspection via [`ArchitectureGraph.tsx`](file:///c:/Users/Witbix/Gitkit/archon/src/components/ArchitectureGraph.tsx).

### Phase 6: AI Summary
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Integrates structured AI agent outputs to build code summaries, setup steps, and technical explanations.
  - Organizes reports (Onboarding Reading lists, System architecture maps, History Milestones) within MongoDB collections and formats them directly on the frontend dashboard client tabs.

### Phase 7: Chat with Repository
* **Status:** ⏳ **Pending / Next Up**
* **Planned Implementation:**
  - **Code Chunking & Embeddings:** Parse files into logical structural chunks. Generate vector embeddings for these chunks using OpenAI embeddings APIs (or local TF-IDF/SentenceTransformer models).
  - **Vector Storage:** Implement a semantic search backend using MongoDB Atlas Vector Search or a lightweight in-memory vector store (e.g., HNSWLib / Voy / Chroma).
  - **RAG Chat Endpoint:** Add a `/api/repos/:id/chat` endpoint. Query code chunks based on user query embeddings, compile matching segments as context within the LLM prompt, and stream model responses.
  - **Chat Interface UI:** Build a console-style "Chat" tab in the repository dashboard featuring real-time stream rendering, syntax-highlighted code answers, and file reference links.

### Phase 8: Tree-sitter
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Configured AST parsing inside [`parser.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/lib/parser.ts) using [`web-tree-sitter`](https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web).
  - Configured language WASM compilation binaries for JavaScript, TypeScript, TSX, Python, and Go.
  - Measures Cyclomatic Complexity dynamically by counting structures (`if_statement`, `for_statement`, `while_statement`, conditional logic expressions, and logical AND/OR operations).
  - Automatically isolates system imports, class declarations, and function signatures.
  - Includes a fallback metrics estimator using string search metrics if Tree-sitter wasm is not available.

### Phase 9: Git History
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Developed custom git log extraction in [`git.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/lib/git.ts#L115-L163) using child process executions.
  - Collects commit hashes, authors, formatted commit dates, and messages.
  - Feeds historical logs into a specialized History AI agent to group commits into chronological development milestones, constructing the Project Story timeline.

### Phase 10: Issues & PRs
* **Status:** ⏳ **Pending**
* **Planned Implementation:**
  - **GitHub API Integration:** Fetch list of active and closed issues and pull requests using GitHub REST/GraphQL APIs with the configured PAT.
  - **MongoDB Storage:** Store metadata (ID, title, state, labels, creator, link, date, timeline comments) in an `issues` collection.
  - **AI Helper Integration:** Analyze issues automatically using the files index and suggest matching codebases coordinates likely responsible for resolving the ticket.
  - **Front-end View:** Create an "Issues & PRs" tab in the repository dashboard displaying open tickets, contributor assignees, and pull request statuses.

### Phase 11: MongoDB
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Set up a connection layer in [`db.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/lib/db.ts) pointing to a local MongoDB instance (`mongodb://127.0.0.1:27017/archon`).
  - Created collections for system configurations and code metrics: `settings`, `repositories`, `files`, `commits`, and `agentReports`.
  - Implemented database reset handlers to flush all repository and parsed metadata tables cleanly from MongoDB settings panel.

### Phase 12: Authentication
* **Status:** ⏳ **Pending**
* **Planned Implementation:**
  - **Multi-Tenant Support:** Integrate NextAuth.js or custom JSON Web Tokens (JWT) to secure access.
  - **User Isolation:** Restrict repository views, settings credentials, and API requests to only authorized owners of corresponding tokens.
  - **Login Interfaces:** Create dark glassmorphic Sign-in, Register, and Account configuration pages.

### Phase 13: Technical Debt
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Configured a Technical Debt assessment agent pipeline in [`agents.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/lib/agents.ts#L174-L213).
  - Evaluates average complexity, highlighting files exceeding a threshold complexity score of 10 as "Refactoring Hotspots".
  - Summarizes potential dead code occurrences, provides refactoring roadmaps, and details structural risks inside the Debt tab.

### Phase 14: AI Agents
* **Status:** ✅ **Completed**
* **Technical Details:**
  - Engineered a modular multi-agent pipeline inside [`agents.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/lib/agents.ts#L174-L213).
  - Employs fallback LLM configuration: selects Groq `llama-3.3-70b-versatile` as primary high-speed engine, with automatic fallbacks to Anthropic `claude-3-5-sonnet-20241022` and OpenAI `gpt-4o-mini` if keys are missing.
  - Runs parallelized, schema-enforced prompt completions for dedicated agent roles: Software Architect, Tech Lead, Auditor, and Git Historian.

### Phase 15: UI Polish
* **Status:** 🔄 **In Progress / Ongoing**
* **Details:**
  - Continuously adjusting layout aesthetics, slide-out drawer components, loading indicators, and typography elements.
  - Upcoming tasks: add code syntax highlighting to the source viewer drawer, include tooltips for graph nodes, and create canvas search filters.

### Phase 16: Redis
* **Status:** ⏳ **Pending**
* **Planned Implementation:**
  - **Caching Engine:** Install and configure Redis to store API responses and session keys.
  - **File Viewer Cache:** Cache parsed source files and file logs to reduce DB fetch operations during tree navigation.

### Phase 17: BullMQ
* **Status:** ⏳ **Pending**
* **Planned Implementation:**
  - **Queue Scheduler:** Transition the current in-memory background worker `analyzeRepositoryInBackground` in [`server.ts`](file:///c:/Users/Witbix/Gitkit/backend/src/server.ts#L362) to a robust BullMQ task execution workflow.
  - **Progress Streams:** Implement multi-step progress listeners reporting analysis phases (Cloning -> Scanning -> Parsing -> Agents) via WebSocket or SSE updates.
  - **Job Workers:** Separate the Express API server from job processing executors to handle heavy parsing tasks independently without blocking the application.

### Phase 18: PostgreSQL (Optional)
* **Status:** ⏳ **Pending / Optional**
* **Planned Implementation:**
  - **Relational Data Mapping:** Evaluate migrating core telemetry models (commits, file nodes, authors) to PostgreSQL to support rigid database structures.
  - **Prisma ORM Integration:** Utilize Prisma as ORM if relational mapping is adopted.

### Phase 19: Production & Scaling
* **Status:** ⏳ **Pending**
* **Planned Implementation:**
  - **Docker Setup:** Package the Next.js app, Node.js API, and worker threads into lightweight container images.
  - **Orchestration Config:** Deploy local services using a single `docker-compose.yml` defining API, workers, MongoDB, Redis, and network routes.
  - **CI/CD Pipeline:** Implement GitHub Actions to verify type checking, execute ESLint rules, compile builds, and trigger automatic deployments.
