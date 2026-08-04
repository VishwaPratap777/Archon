# ΛRCHON — Web Application (Frontend)

This directory contains the Next.js frontend client for **Archon — AI-Powered Repository Intelligence Platform**.

> [!NOTE]
> For the primary project documentation, architecture diagrams, performance benchmarks, and deep-dive technical tradeoffs, see the root [README.md](../README.md).

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js (v18+) installed and the backend server running on port 5000 (`http://localhost:5000`).

### 2. Configure Environment Variables
Copy `.env.local.example` or create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Run Development Server
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 AI Credentials & API Keys

Archon supports bringing your own API keys. You can set them in `backend/.env` or in the application Settings modal:
- **GROQ_API_KEY**: Primary high-speed reasoning engine (`llama-3.3-70b-versatile`).
- **OPENAI_API_KEY**: Fallback engine (`gpt-4o-mini` / `text-embedding-3-small`). Can be used as the **sole key** for all operations.
- **ANTHROPIC_API_KEY**: Optional fallback engine (`claude-3.5-sonnet`).
- **GITHUB_PAT**: Optional Personal Access Token for private repository analysis.

---

## 🛠️ Production Build Verification

To verify frontend compilation:
```bash
npm run build
```
