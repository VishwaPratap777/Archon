/**
 * retrieval/query.ts — Query understanding and classification
 * 
 * Classifies the user's question and expands it with relevant keywords
 * to improve vector search recall. Uses rule-based matching first,
 * falls back to LLM only for ambiguous queries.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type QueryCategory =
  | 'architecture'
  | 'auth'
  | 'database'
  | 'api'
  | 'component'
  | 'function'
  | 'general';

export interface UnderstandingResult {
  originalQuery: string;
  category: QueryCategory;
  expandedQuery: string;
  searchFilters: {
    preferredChunkTypes: ('code' | 'file_summary' | 'repo_summary')[];
  };
}

// ─── Keyword Patterns ────────────────────────────────────────────────────────

const CATEGORY_PATTERNS: { category: QueryCategory; patterns: RegExp; expansion: string }[] = [
  {
    category: 'architecture',
    patterns: /\b(architect|structure|overview|organized|folder|layout|design pattern|how.*(built|structured|organized))\b/i,
    expansion: 'architecture structure folder organization layers design pattern project overview',
  },
  {
    category: 'auth',
    patterns: /\b(auth|login|logout|signup|register|session|jwt|token|password|credential|oauth|permission|role)\b/i,
    expansion: 'authentication login register JWT token session password bcrypt middleware auth',
  },
  {
    category: 'database',
    patterns: /\b(database|db|mongo|postgres|mysql|redis|model|schema|collection|query|orm|prisma|mongoose|migration)\b/i,
    expansion: 'database model schema collection query connection ORM data persistence',
  },
  {
    category: 'api',
    patterns: /\b(api|route|endpoint|rest|graphql|controller|handler|middleware|request|response|express|fetch|axios)\b/i,
    expansion: 'API route endpoint handler controller middleware request response REST',
  },
  {
    category: 'component',
    patterns: /\b(component|page|view|layout|ui|render|jsx|tsx|template|widget|hook|use[A-Z])\b/i,
    expansion: 'component page view layout UI render JSX React hook state props',
  },
  {
    category: 'function',
    patterns: /\b(function|method|util|helper|where.*(defined|implemented|located)|how.*work|explain.*code)\b/i,
    expansion: 'function implementation definition utility helper module export',
  },
];

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Understand and classify a user query.
 * Returns the category, expanded search query, and chunk type preferences.
 */
export function understandQuery(query: string): UnderstandingResult {
  // Try rule-based classification first
  for (const { category, patterns, expansion } of CATEGORY_PATTERNS) {
    if (patterns.test(query)) {
      return {
        originalQuery: query,
        category,
        expandedQuery: `${query} ${expansion}`,
        searchFilters: getChunkPreferences(category),
      };
    }
  }

  // Default: general question
  return {
    originalQuery: query,
    category: 'general',
    expandedQuery: query,
    searchFilters: {
      preferredChunkTypes: ['code', 'file_summary', 'repo_summary'],
    },
  };
}

// ─── Chunk Type Preferences ──────────────────────────────────────────────────

function getChunkPreferences(category: QueryCategory) {
  switch (category) {
    case 'architecture':
      return { preferredChunkTypes: ['repo_summary', 'file_summary'] as ('code' | 'file_summary' | 'repo_summary')[] };
    case 'auth':
    case 'database':
    case 'api':
      return { preferredChunkTypes: ['file_summary', 'code'] as ('code' | 'file_summary' | 'repo_summary')[] };
    case 'component':
    case 'function':
      return { preferredChunkTypes: ['code', 'file_summary'] as ('code' | 'file_summary' | 'repo_summary')[] };
    default:
      return { preferredChunkTypes: ['code', 'file_summary', 'repo_summary'] as ('code' | 'file_summary' | 'repo_summary')[] };
  }
}
