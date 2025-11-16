import * as esprima from "esprima";

export interface CarbonMetrics {
  lines: number;
  loops: number;
  conditions: number;
  functionCount: number;
  ioOps: number;
  memoryAllocations: number;
  cyclomaticComplexity: number;
}

/**
 * Analyze code metrics for multiple languages.
 * languageId should be the VS Code document.languageId (e.g. 'javascript','typescript','python','java').
 */
export function analyzeCodeMetrics(code: string, languageId: string = "javascript"): CarbonMetrics {
  const metrics: CarbonMetrics = {
    lines: code.split("\n").length,
    loops: 0,
    conditions: 0,
    functionCount: 0,
    ioOps: 0,
    memoryAllocations: 0,
    cyclomaticComplexity: 1,
  };

  if (!code.trim()) {
    return metrics;
  }

  const lang = (languageId || "javascript").toLowerCase();

  try {
    if (lang === "javascript" || lang === "typescript" || lang === "javascriptreact" || lang === "typescriptreact") {
      const ast = esprima.parseScript(code, { tolerant: true, loc: true });

      function walk(node: any) {
        if (!node || typeof node !== "object") {
          return;
        }

        switch (node.type) {
          case "ForStatement":
          case "WhileStatement":
          case "DoWhileStatement":
            metrics.loops++;
            metrics.cyclomaticComplexity++;
            break;

          case "IfStatement":
          case "ConditionalExpression":
            metrics.conditions++;
            metrics.cyclomaticComplexity++;
            break;

          case "FunctionDeclaration":
          case "FunctionExpression":
          case "ArrowFunctionExpression":
            metrics.functionCount++;
            break;

          case "CallExpression":
            // callee can be Identifier or MemberExpression
            const calleeName = node.callee && (node.callee.name || (node.callee.property && node.callee.property.name));
            if (calleeName && (calleeName === "console" || calleeName === "print" || calleeName === "fetch" || calleeName === "readFileSync")) {
              metrics.ioOps++;
            }
            break;

          case "ObjectExpression":
          case "ArrayExpression":
          case "NewExpression":
            metrics.memoryAllocations++;
            break;
        }

        for (const key in node) {
          const child = node[key];
          if (child && typeof child === "object" && child.type) {
            walk(child);
          } else if (Array.isArray(child)) {
            child.forEach(x => x && x.type && walk(x));
          }
        }
      }

      walk(ast);
      return metrics;
    }

    // Java heuristics (regex-based)
    if (lang === "java") {
      const lines = metrics.lines;
      const loopMatches = code.match(/\bfor\s*\(|\bwhile\s*\(|\bdo\s*\{/g) || [];
      const ifMatches = code.match(/\bif\s*\(|\belse\s+if\s*\(/g) || [];
      const switchMatches = code.match(/\bswitch\s*\(/g) || [];
      const methodMatches = code.match(/(?:public|protected|private|static|synchronized|final|\s)+\s+[\w\<\>\[\]]+\s+\w+\s*\([^)]*\)\s*\{/g) || [];
      const constructorMatches = code.match(/(?:public|protected|private)\s+[A-Z]\w*\s*\([^)]*\)\s*\{/g) || [];
      const newMatches = code.match(/\bnew\s+[A-Za-z0-9_\<\>\[\]]+/g) || [];
      const ioMatches = code.match(/System\.out\.println|System\.err\.println|Files\.read|Files\.write|FileInputStream|FileOutputStream|BufferedReader|Scanner\s*\(/g) || [];

      metrics.loops = loopMatches.length;
      metrics.conditions = ifMatches.length + switchMatches.length;
      metrics.functionCount = methodMatches.length + constructorMatches.length;
      metrics.ioOps = ioMatches.length;
      metrics.memoryAllocations = newMatches.length;
      metrics.cyclomaticComplexity = 1 + metrics.loops + metrics.conditions;

      return metrics;
    }

    // Python heuristics (regex-based)
    if (lang === "python") {
      const loopMatches = code.match(/^\s*for\s+.*:|^\s*while\s+.*:/gm) || [];
      const ifMatches = code.match(/^\s*if\s+.*:|^\s*elif\s+.*:/gm) || [];
      const defMatches = code.match(/^\s*def\s+\w+\s*\(/gm) || [];
      const classMatches = code.match(/^\s*class\s+\w+\s*\(?/gm) || [];
      const ioMatches = code.match(/\bprint\s*\(|\bopen\s*\(|\binput\s*\(|\bpandas\.\w+|numpy\.\w+/g) || [];
      const memMatches = code.match(/=\s*\[|=\s*\{|\blist\(|\bdict\(|\bset\(/g) || [];

      metrics.loops = loopMatches.length;
      metrics.conditions = ifMatches.length;
      metrics.functionCount = defMatches.length;
      metrics.ioOps = ioMatches.length;
      metrics.memoryAllocations = memMatches.length + classMatches.length;
      metrics.cyclomaticComplexity = 1 + metrics.loops + metrics.conditions;

      return metrics;
    }

    // Fallback for other languages: simple heuristics
    {
      const lines = metrics.lines;
      const loops = (code.match(/\bfor\b|\bwhile\b/g) || []).length;
      const conditions = (code.match(/\bif\b|\belse\b|\bswitch\b/g) || []).length;
      const functions = (code.match(/\bfunction\b|\bdef\b|\bfunc\b|\bvoid\b|\bint\b/g) || []).length;
      const ioOps = (code.match(/print\(|console\.|System\.out|open\(|readFile|writeFile/g) || []).length;
      const memAllocs = (code.match(/\bnew\b|\[.*\]|\{.*\}/g) || []).length;

      metrics.loops = loops;
      metrics.conditions = conditions;
      metrics.functionCount = functions;
      metrics.ioOps = ioOps;
      metrics.memoryAllocations = memAllocs;
      metrics.cyclomaticComplexity = 1 + loops + conditions;

      return metrics;
    }
  } catch (err) {
    // In case a parser fails, return best-effort metrics already collected
    console.error("analyzeCodeMetrics error:", err);
    return metrics;
  }
}