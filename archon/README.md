# ΛRCHON - AI-Powered Repository Intelligence Platform

Archon is an advanced engineering intelligence platform that reconstructs codebase architecture, onboarding guidelines, technical debt, and history by parsing code ASTs and utilizing reasoning AI agents.

## Getting Started

### 1. Run MongoDB Local Server
Ensure you have MongoDB running locally:
```bash
mongodb://127.0.0.1:27017/archon
```

### 2. Configure Credentials
Copy `.env.local.example` or create `.env.local` in the `archon` directory:
```bash
GROQ_API_KEY=your-groq-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GITHUB_PAT=your-github-pat
```

> [!NOTE]
> **AI Engine Priority & Optional Keys:**
> - **Groq** (`llama-3.3-70b-versatile`) acts as the **primary, default engine** for ultra-high-speed analysis.
> - **OpenAI** (`gpt-4o-mini`) and **Anthropic** (`claude-3.5-sonnet`) are configured as **optional fallbacks**.
> - **If you clone this repository**, you do not need all keys! You can simply plug in your **OpenAI API Key** alone, and the system will automatically fall back to OpenAI to execute all agents and vector search embeddings.

### 3. Run the Development Server
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page and start analyzing codebases.

## Verification
To verify code compiles and type checks:
```bash
npm run build
```
