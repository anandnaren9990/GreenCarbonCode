import * as vscode from 'vscode';

export async function getGreenerCodeSuggestionWithCopilot(code: string): Promise<string> {
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
    // Use Copilot's language model through VS Code's built-in API
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

    return optimizedCode.trim();
  } catch (error) {
    console.error("Copilot Error:", error);
    throw error;
  }
}