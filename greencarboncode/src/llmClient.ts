import * as vscode from 'vscode';

// Simple in-memory cache
const codeCache = new Map<string, string>();
const testCache = new Map<string, string>();
const explanationCache = new Map<string, string>();

export async function getGreenerCodeSuggestionWithCopilot(code: string, language?: string): Promise<string> {
  // Check cache first
  const cacheKey = hashCode(code);
  if (codeCache.has(cacheKey)) {
    console.log('[greencarbon] Returning cached Copilot suggestion');
    return codeCache.get(cacheKey)!;
  }

  const prompt = `You are a code optimization expert focused on reducing computational carbon footprint.
Analyze the following ${language || 'code'} and suggest a more efficient, greener alternative that:
1. Reduces time complexity where possible
2. Minimizes memory allocations
3. Reduces unnecessary loops or I/O operations
4. Maintains the same functionality

Original code:
\`\`\`${language || ''}
${code}
\`\`\`

Provide only the optimized code without explanations.`;

  try {
    console.log('[greencarbon] Calling Copilot API...');
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4' });
    
    if (!model) {
      throw new Error('Copilot model not available. Make sure GitHub Copilot extension is installed and authenticated.');
    }

    const messages = [
      vscode.LanguageModelChatMessage.User(prompt)
    ];

    const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    
    let optimizedCode = '';
    for await (const chunk of chatResponse.text) {
      optimizedCode += chunk;
    }

    const trimmedCode = optimizedCode.trim();

    // Store in cache
    codeCache.set(cacheKey, trimmedCode);
    console.log('[greencarbon] Cached new Copilot suggestion');

    return trimmedCode;
  } catch (error) {
    console.error("Copilot Error:", error);
    throw error;
  }
}

export async function generateExplanationWithCopilot(originalCode: string, optimizedCode: string, language: string): Promise<string> {
  // Check cache first - use combination of both codes for cache key
  const cacheKey = hashCode(originalCode + optimizedCode + language);
  if (explanationCache.has(cacheKey)) {
    console.log('[greencarbon] Returning cached explanation');
    return explanationCache.get(cacheKey)!;
  }

  const prompt = `Compare the following original and optimized ${language} code and explain the key differences.
Focus on:
1. What optimizations were made and why
2. How these changes reduce computational complexity
3. How these changes reduce carbon footprint
4. Performance improvements expected
5. Memory usage improvements

Original Code:
\`\`\`${language}
${originalCode}
\`\`\`

Optimized Code:
\`\`\`${language}
${optimizedCode}
\`\`\`

Provide a clear, structured explanation of the differences and improvements.`;

  try {
    console.log('[greencarbon] Calling Copilot API for explanation...');
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4' });
    
    if (!model) {
      throw new Error('Copilot model not available.');
    }

    const messages = [
      vscode.LanguageModelChatMessage.User(prompt)
    ];

    const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    
    let explanation = '';
    for await (const chunk of chatResponse.text) {
      explanation += chunk;
    }

    const trimmedExplanation = explanation.trim();

    // Store in cache
    explanationCache.set(cacheKey, trimmedExplanation);
    console.log('[greencarbon] Cached new explanation');

    return trimmedExplanation;
  } catch (error) {
    console.error("Copilot Explanation Error:", error);
    return "// Failed to generate explanation";
  }
}

export async function generateTestCasesWithCopilot(code: string, language: string): Promise<string> {
  // Check cache first - use code + language for cache key
  const cacheKey = hashCode(code + language);
  if (testCache.has(cacheKey)) {
    console.log('[greencarbon] Returning cached test cases');
    return testCache.get(cacheKey)!;
  }

  const prompt = `Generate comprehensive test cases for the following ${language} code.
Include:
1. Unit tests for all functions/methods
2. Edge cases (empty inputs, null values, boundary conditions)
3. Normal use cases
4. Error handling tests

Code to test:
\`\`\`${language}
${code}
\`\`\`

Provide only the test code in the appropriate testing framework for ${language} (e.g., Jest for JavaScript, pytest for Python, JUnit for Java).`;

  try {
    console.log('[greencarbon] Calling Copilot API for test cases...');
    const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4' });
    
    if (!model) {
      throw new Error('Copilot model not available.');
    }

    const messages = [
      vscode.LanguageModelChatMessage.User(prompt)
    ];

    const chatResponse = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
    
    let testCases = '';
    for await (const chunk of chatResponse.text) {
      testCases += chunk;
    }

    const trimmedTests = testCases.trim();

    // Store in cache
    testCache.set(cacheKey, trimmedTests);
    console.log('[greencarbon] Cached new test cases');

    return trimmedTests;
  } catch (error) {
    console.error("Copilot Test Generation Error:", error);
    return "// Failed to generate test cases";
  }
}

// Simple hash function for cache key
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

// Clear cache function (optional)
export function clearCodeCache() {
  codeCache.clear();
  testCache.clear();
  explanationCache.clear();
  console.log('[greencarbon] All Copilot caches cleared (code, tests, explanations)');
}

// Get cache statistics
export function getCacheStats() {
  return {
    codeCacheSize: codeCache.size,
    testCacheSize: testCache.size,
    explanationCacheSize: explanationCache.size,
    totalCacheSize: codeCache.size + testCache.size + explanationCache.size
  };
}