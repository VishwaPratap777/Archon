/**
 * indexing/parser.ts — Rich AST extraction using Tree-sitter
 * 
 * Parses source files and extracts detailed structural metadata:
 *   imports, exports, functions, classes, interfaces, components,
 *   hooks, routes, middleware, API endpoints, DB models, env vars.
 */

import * as TreeSitter from 'web-tree-sitter';
import path from 'path';
import fs from 'fs';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AstSymbol {
  name: string;
  type: 'function' | 'class' | 'component' | 'hook' | 'method' | 'exported_const';
  startLine: number;
  endLine: number;
  code: string;
  parentSymbol?: string;
}

export interface ParsedFileInfo {
  complexity: number;
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  interfaces: string[];
  components: string[];
  hooks: string[];
  routes: string[];
  middleware: string[];
  apiEndpoints: string[];
  dbModels: string[];
  envVars: string[];
  symbols: AstSymbol[];
}

// ─── Tree-sitter Initialization ──────────────────────────────────────────────

let parserInitialized = false;
const languageCache: Record<string, TreeSitter.Language> = {};

const EXTENSION_TO_WASM: Record<string, string> = {
  '.js': 'tree-sitter-javascript.wasm',
  '.jsx': 'tree-sitter-tsx.wasm',
  '.mjs': 'tree-sitter-javascript.wasm',
  '.cjs': 'tree-sitter-javascript.wasm',
  '.ts': 'tree-sitter-typescript.wasm',
  '.tsx': 'tree-sitter-tsx.wasm',
  '.py': 'tree-sitter-python.wasm',
  '.go': 'tree-sitter-go.wasm',
};

async function initParser() {
  if (parserInitialized) return;
  const wasmPath = path.join(process.cwd(), 'node_modules', 'web-tree-sitter', 'web-tree-sitter.wasm');
  await TreeSitter.Parser.init({ locateFile: () => wasmPath });
  parserInitialized = true;
}

async function getLanguage(ext: string): Promise<TreeSitter.Language | null> {
  await initParser();
  const wasmName = EXTENSION_TO_WASM[ext];
  if (!wasmName) return null;
  if (languageCache[wasmName]) return languageCache[wasmName];

  try {
    const langPath = path.join(process.cwd(), 'node_modules', 'tree-sitter-wasms', 'out', wasmName);
    if (!fs.existsSync(langPath)) return null;
    const lang = await TreeSitter.Language.load(langPath);
    languageCache[wasmName] = lang;
    return lang;
  } catch {
    return null;
  }
}

// ─── Fallback Regex Parser (for unsupported languages) ───────────────────────

function regexFallback(content: string): ParsedFileInfo {
  const count = (pattern: RegExp) => (content.match(pattern) || []).length;

  return {
    complexity: 1 + count(/\bif\b/g) + count(/\bfor\b/g) + count(/\bwhile\b/g) + count(/\bcatch\b/g),
    imports: [],
    exports: [],
    functions: (content.match(/(?:function|def)\s+(\w+)/g) || []).map(m => m.split(/\s+/)[1]),
    classes: (content.match(/class\s+(\w+)/g) || []).map(m => m.split(/\s+/)[1]),
    interfaces: [],
    components: [],
    hooks: [],
    routes: [],
    middleware: [],
    apiEndpoints: [],
    dbModels: [],
    envVars: (content.match(/process\.env\.(\w+)/g) || []).map(m => m.replace('process.env.', '')),
    symbols: [],
  };
}

// ─── Main Parse Function ─────────────────────────────────────────────────────

export async function parseSourceFile(content: string, ext: string): Promise<ParsedFileInfo> {
  const lang = await getLanguage(ext);
  if (!lang) return regexFallback(content);

  try {
    const parser = new TreeSitter.Parser();
    parser.setLanguage(lang);
    const tree = parser.parse(content);
    if (!tree) return regexFallback(content);

    const root = tree.rootNode;
    const result: ParsedFileInfo = {
      complexity: 1,
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      interfaces: [],
      components: [],
      hooks: [],
      routes: [],
      middleware: [],
      apiEndpoints: [],
      dbModels: [],
      envVars: [],
      symbols: [],
    };

    traverse(root, result, content);
    return result;
  } catch (err) {
    console.warn(`[Parser] Tree-sitter failed for ${ext}, using regex fallback.`);
    return regexFallback(content);
  }
}

// ─── AST Traversal ───────────────────────────────────────────────────────────

function traverse(node: TreeSitter.Node, result: ParsedFileInfo, content: string, parentSymbol?: string): void {
  const type = node.type;
  const text = node.text;

  // ── Complexity ──
  if (
    type === 'if_statement' || type === 'for_statement' || type === 'for_in_statement' ||
    type === 'while_statement' || type === 'do_statement' || type === 'catch_clause' ||
    type === 'conditional_expression'
  ) {
    result.complexity++;
  }
  if (type === 'binary_expression' && (text.includes('&&') || text.includes('||') || text.includes('??'))) {
    result.complexity++;
  }

  // ── Imports (JS/TS) ──
  if (type === 'import_statement') {
    const sourceNode = node.childForFieldName('source');
    if (sourceNode) {
      result.imports.push(sourceNode.text.replace(/['"]/g, ''));
    } else {
      // Fallback: find string child
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child && child.type === 'string') {
          result.imports.push(child.text.replace(/['"]/g, ''));
          break;
        }
      }
    }
  }

  // ── Imports (Python) ──
  if (type === 'import_from_statement') {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && (child.type === 'dotted_name' || child.type === 'relative_import')) {
        result.imports.push(child.text);
      }
    }
  }

  // ── Require calls ──
  if (type === 'call_expression') {
    const funcNode = node.childForFieldName('function');
    const funcText = funcNode?.text || '';

    if (funcText === 'require') {
      const argsNode = node.childForFieldName('arguments');
      if (argsNode && argsNode.childCount > 1) {
        const pathNode = argsNode.child(1);
        if (pathNode) result.imports.push(pathNode.text.replace(/['"]/g, ''));
      }
    }

    // ── Route detection: app.get('/path', ...), router.post('/path', ...) ──
    if (funcNode && funcNode.type === 'member_expression') {
      const method = funcNode.childForFieldName('property')?.text || '';
      const object = funcNode.childForFieldName('object')?.text || '';

      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        if (['app', 'router', 'server'].includes(object)) {
          const argsNode = node.childForFieldName('arguments');
          if (argsNode && argsNode.childCount > 1) {
            const routeArg = argsNode.child(1);
            if (routeArg) {
              result.routes.push(`${method.toUpperCase()} ${routeArg.text.replace(/['"]/g, '')}`);
            }
          }
        }
      }

      // ── Middleware detection: app.use(...) ──
      if (method === 'use' && ['app', 'router', 'server'].includes(object)) {
        const argsNode = node.childForFieldName('arguments');
        if (argsNode && argsNode.childCount > 1) {
          const arg = argsNode.child(1);
          if (arg) {
            const argText = arg.text.length > 60 ? arg.text.slice(0, 60) + '...' : arg.text;
            result.middleware.push(argText);
          }
        }
      }

      // ── API call detection: fetch(...), axios.get(...) ──
      if (['fetch'].includes(object) || ['get', 'post', 'put', 'delete'].includes(method) && object === 'axios') {
        const argsNode = node.childForFieldName('arguments');
        if (argsNode && argsNode.childCount > 1) {
          const urlArg = argsNode.child(1);
          if (urlArg) {
            const urlText = urlArg.text.replace(/['"`]/g, '').slice(0, 80);
            result.apiEndpoints.push(urlText);
          }
        }
      }

      // ── DB model detection: mongoose.model(...), db.collection(...) ──
      if (method === 'model' && (object === 'mongoose' || object.endsWith('Schema'))) {
        const argsNode = node.childForFieldName('arguments');
        if (argsNode && argsNode.childCount > 1) {
          result.dbModels.push(argsNode.child(1)?.text.replace(/['"]/g, '') || 'unknown');
        }
      }
      if (method === 'collection') {
        const argsNode = node.childForFieldName('arguments');
        if (argsNode && argsNode.childCount > 1) {
          result.dbModels.push(argsNode.child(1)?.text.replace(/['"]/g, '') || 'unknown');
        }
      }
    }

    // ── fetch() as direct call ──
    if (funcText === 'fetch') {
      const argsNode = node.childForFieldName('arguments');
      if (argsNode && argsNode.childCount > 1) {
        const urlArg = argsNode.child(1);
        if (urlArg) result.apiEndpoints.push(urlArg.text.replace(/['"`]/g, '').slice(0, 80));
      }
    }
  }

  // ── Exports ──
  if (type === 'export_statement' || type === 'export_default_declaration') {
    // Try to get the exported name
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;
      const name = child.childForFieldName('name')?.text;
      if (name) {
        result.exports.push(name);
        break;
      }
    }
    // If no named export found, mark as 'default'
    if (type === 'export_default_declaration' && !result.exports.includes('default')) {
      result.exports.push('default');
    }
  }

  // ── Functions ──
  let currentParent = parentSymbol;
  if (
    type === 'function_declaration' || type === 'function_definition'
  ) {
    const name = node.childForFieldName('name')?.text;
    if (name) {
      result.functions.push(name);
      let symType: AstSymbol['type'] = 'function';
      if (/^[A-Z]/.test(name)) {
        result.components.push(name);
        symType = 'component';
      }
      if (/^use[A-Z]/.test(name)) {
        result.hooks.push(name);
        symType = 'hook';
      }
      result.symbols.push({
        name,
        type: symType,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        code: node.text,
        parentSymbol,
      });
    }
  }

  // ── Arrow functions & Exported constants/objects ──
  if (type === 'lexical_declaration' || type === 'variable_declaration') {
    const isExported = node.parent?.type === 'export_statement' || node.parent?.type === 'export_default_declaration';
    for (let i = 0; i < node.childCount; i++) {
      const declarator = node.child(i);
      if (!declarator || declarator.type !== 'variable_declarator') continue;
      const name = declarator.childForFieldName('name')?.text;
      const value = declarator.childForFieldName('value');
      if (name && value) {
        if (value.type === 'arrow_function' || value.type === 'function_expression') {
          result.functions.push(name);
          let symType: AstSymbol['type'] = 'function';
          if (/^[A-Z]/.test(name)) { result.components.push(name); symType = 'component'; }
          if (/^use[A-Z]/.test(name)) { result.hooks.push(name); symType = 'hook'; }
          result.symbols.push({
            name,
            type: symType,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            code: node.text,
            parentSymbol,
          });
        } else if (isExported) {
          result.symbols.push({
            name,
            type: 'exported_const',
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            code: node.text,
            parentSymbol,
          });
        }
      }
    }
  }

  // ── Classes ──
  if (type === 'class_declaration' || type === 'class_definition') {
    const name = node.childForFieldName('name')?.text;
    if (name) {
      result.classes.push(name);
      currentParent = name;
      result.symbols.push({
        name,
        type: 'class',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        code: node.text,
        parentSymbol,
      });
    }
  }

  // ── Interfaces & Type Aliases (TypeScript) ──
  if (type === 'interface_declaration') {
    const name = node.childForFieldName('name')?.text;
    if (name) result.interfaces.push(name);
  }
  if (type === 'type_alias_declaration') {
    const name = node.childForFieldName('name')?.text;
    if (name) result.interfaces.push(name);
  }

  // ── Environment variables: process.env.XXX ──
  if (type === 'member_expression') {
    const objText = node.childForFieldName('object')?.text || '';
    const prop = node.childForFieldName('property')?.text || '';
    if (objText === 'process.env' && prop) {
      if (!result.envVars.includes(prop)) {
        result.envVars.push(prop);
      }
    }
  }

  // ── Method definitions (class methods) ──
  if (type === 'method_definition') {
    const name = node.childForFieldName('name')?.text;
    if (name) {
      result.functions.push(name);
      result.symbols.push({
        name,
        type: 'method',
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        code: node.text,
        parentSymbol: currentParent,
      });
    }
  }

  // Recurse into children
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) traverse(child, result, content, currentParent);
  }
}
