import * as TreeSitter from 'web-tree-sitter';
import path from 'path';
import fs from 'fs';

let parserInitialized = false;
const languageCache: Record<string, TreeSitter.Language> = {};

// Map file extensions to their Tree-sitter language WASM file names
const EXTENSION_TO_LANG_WASM: Record<string, string> = {
  '.js': 'tree-sitter-javascript.wasm',
  '.jsx': 'tree-sitter-tsx.wasm', // TSX grammar handles JSX beautifully
  '.mjs': 'tree-sitter-javascript.wasm',
  '.cjs': 'tree-sitter-javascript.wasm',
  '.ts': 'tree-sitter-typescript.wasm',
  '.tsx': 'tree-sitter-tsx.wasm',
  '.py': 'tree-sitter-python.wasm',
  '.go': 'tree-sitter-go.wasm',
};

async function initParser() {
  if (parserInitialized) return;
  
  const wasmPath = path.join(process.cwd(), 'node_modules', 'web-tree-sitter', 'tree-sitter.wasm');
  
  await TreeSitter.Parser.init({
    locateFile() {
      return wasmPath;
    }
  });
  
  parserInitialized = true;
}

async function getLanguageForExtension(ext: string): Promise<TreeSitter.Language | null> {
  await initParser();
  
  const wasmName = EXTENSION_TO_LANG_WASM[ext];
  if (!wasmName) return null;
  
  if (languageCache[wasmName]) {
    return languageCache[wasmName];
  }
  
  try {
    const langPath = path.join(process.cwd(), 'node_modules', 'tree-sitter-wasms', 'out', wasmName);
    if (!fs.existsSync(langPath)) {
      console.warn(`WASM grammar file not found at ${langPath}`);
      return null;
    }
    
    const lang = await TreeSitter.Language.load(langPath);
    languageCache[wasmName] = lang;
    return lang;
  } catch (error) {
    console.error(`Failed to load Tree-sitter language WASM for ${ext}:`, error);
    return null;
  }
}

export interface ParsedFileInfo {
  complexity: number;
  imports: string[];
  functionsCount: number;
  classesCount: number;
}

export async function parseSourceFile(content: string, ext: string): Promise<ParsedFileInfo> {
  const defaultResult: ParsedFileInfo = {
    complexity: 1,
    imports: [],
    functionsCount: 0,
    classesCount: 0,
  };

  const lang = await getLanguageForExtension(ext);
  if (!lang) {
    // If not supported, estimate complexity simply using control flow regexes
    const ifCount = (content.match(/\bif\b/g) || []).length;
    const forCount = (content.match(/\bfor\b/g) || []).length;
    const whileCount = (content.match(/\bwhile\b/g) || []).length;
    const catchCount = (content.match(/\bcatch\b/g) || []).length;
    defaultResult.complexity = 1 + ifCount + forCount + whileCount + catchCount;
    return defaultResult;
  }

  try {
    const parser = new TreeSitter.Parser();
    parser.setLanguage(lang);
    
    const tree = parser.parse(content);
    if (!tree) return defaultResult;
    const root = tree.rootNode;
    
    let complexity = 1;
    const imports: string[] = [];
    let functionsCount = 0;
    let classesCount = 0;

    // Traverse the AST recursively
    function traverse(node: TreeSitter.Node) {
      const type = node.type;

      // 1. Complexity calculation: Count branching and loops
      if (
        type === 'if_statement' ||
        type === 'for_statement' ||
        type === 'for_in_statement' ||
        type === 'while_statement' ||
        type === 'do_statement' ||
        type === 'catch_clause' ||
        type === 'conditional_expression' // Ternary operator ?:
      ) {
        complexity++;
      }
      
      // JS/TS logical operators in binary expressions
      if (type === 'binary_expression') {
        const text = node.text;
        if (text.includes('&&') || text.includes('||') || text.includes('??')) {
          complexity++;
        }
      }
      
      // Python logical operators
      if (type === 'boolean_operator') {
        complexity++;
      }

      // 2. Count Functions and Classes
      if (
        type === 'function_declaration' ||
        type === 'function_expression' ||
        type === 'arrow_function' ||
        type === 'method_definition' ||
        type === 'function_definition' // Python
      ) {
        functionsCount++;
      }

      if (type === 'class_declaration' || type === 'class_definition') {
        classesCount++;
      }

      // 3. Extract Imports
      // JS / TS ES6 Imports
      if (type === 'import_statement') {
        // Look for string literal representing the import source
        const sourceNode = node.childForFieldName('source');
        if (sourceNode) {
          // Remove surrounding quotes
          const rawPath = sourceNode.text.replace(/['"]/g, '');
          imports.push(rawPath);
        } else {
          // Fallback node traversal to find string literal
          for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child && child.type === 'string') {
              imports.push(child.text.replace(/['"]/g, ''));
              break;
            }
          }
        }
      }

      // JS / TS CommonJS require
      if (type === 'call_expression') {
        const functionNode = node.childForFieldName('function');
        if (functionNode && functionNode.text === 'require') {
          const argumentsNode = node.childForFieldName('arguments');
          if (argumentsNode && argumentsNode.childCount > 1) {
            const pathNode = argumentsNode.child(1); // Usually syntax is ( arguments -> [ "(" , string_literal, ")" ] )
            if (pathNode && (pathNode.type === 'string' || pathNode.type === 'string_fragment' || pathNode.type === 'raw_string')) {
              imports.push(pathNode.text.replace(/['"]/g, ''));
            }
          }
        }
      }

      // Python import
      if (type === 'import_statement' || type === 'import_from_statement') {
        // Simple extraction for python: get modules from children
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child && (child.type === 'dotted_name' || child.type === 'relative_import')) {
            imports.push(child.text);
          }
        }
      }

      // Go import specs
      if (type === 'import_spec') {
        const pathNode = node.childForFieldName('path');
        if (pathNode) {
          imports.push(pathNode.text.replace(/['"]/g, ''));
        }
      }

      // Recurse children
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) traverse(child);
      }
    }

    traverse(root);
    
    // Clean up parsed tree memory
    tree.delete();

    return {
      complexity,
      imports: Array.from(new Set(imports)), // Deduplicate
      functionsCount,
      classesCount,
    };
  } catch (error) {
    console.error('Tree-sitter file parse error:', error);
    return defaultResult;
  }
}
