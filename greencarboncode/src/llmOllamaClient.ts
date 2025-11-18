

const OLLAMA_API_URL = "http://localhost:11434/api/generate";
const MODEL = "phi3:mini"; // or your preferred model

export async function getGreenerCodeSuggestionOllama(code: string): Promise<string> {
    const fetch = (await import("node-fetch")).default;
  const prompt = `You are a code optimization expert focused on reducing computational carbon footprint.
Analyze the following code and suggest a more efficient, greener alternative that:
1. Reduces time complexity where possible
2. Minimizes memory allocations
3. Reduces unnecessary loops or I/O operations
4. Maintains the same functionality

Original code:
\`\`\`
${code}
\`\`\`

Provide only the optimized code without explanations.`;

  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as { response: string };
    return data.response.trim();
  } catch (error) {
    console.error("LLM Error:", error);
    throw error;
  }
}