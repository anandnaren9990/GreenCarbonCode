// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as esprima from "esprima";



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "greencarboncode" is now active!');

	// Create a status bar item
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	statusBar.text = "🌱 Carbon: --";
	statusBar.show();

	// Listen for changes in the editor
	vscode.workspace.onDidChangeTextDocument((event) => {
    	const code = event.document.getText();
    	const score = estimateCarbon(code);
    	statusBar.text = `🌱 Carbon: ${score.toFixed(3)} g CO₂`;
  	});

	// Register Command
	const analyzeCommand = vscode.commands.registerCommand("carbon.analyzeCurrentFile", () => {
    	const editor = vscode.window.activeTextEditor;
    	if (!editor) {
      		vscode.window.showErrorMessage("No active text editor.");
      		return;
    	}

		const code = editor.document.getText();
		const score = estimateCarbon(code);
		vscode.window.showInformationMessage(`Estimated Carbon Footprint: ${score.toFixed(3)} g CO₂`);
	});

	context.subscriptions.push(analyzeCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Estimate carbon footprint based on code complexity
function estimateCarbon(code: string): number {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return 0;
    }

    const languageId = editor.document.languageId;
    console.log('Detected language:', languageId);

    try {
        // Skip empty or whitespace-only code
        if (!code.trim()) {
            return 0;
        }

        let complexity = 0;

        // Handle JavaScript/TypeScript
        if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId)) {
            const ast = esprima.parseScript(code, { tolerant: true });
            complexity = JSON.stringify(ast).length;
        }
        else if (languageId === 'java') {
            // Heuristic: line count + weighted counts of methods, constructors, classes, interfaces, enums
            const lines = code.split('\n').length;
            // Match typical Java method signatures (return type + name + params)
            const methodCount = (code.match(/(?:public|protected|private|static|\s)+\s+[\w\<\>\[\]]+\s+\w+\s*\([^)]*\)\s*\{/g) || []).length;
            // Match constructors (access modifier + name + params + { )
            const constructorCount = (code.match(/(?:public|protected|private)\s+\w+\s*\([^)]*\)\s*\{/g) || []).length;
            const classCount = (code.match(/\bclass\s+\w+/g) || []).length;
            const interfaceCount = (code.match(/\binterface\s+\w+/g) || []).length;
            const enumCount = (code.match(/\benum\s+\w+/g) || []).length;

            complexity = lines
                + (methodCount * 120)
                + (constructorCount * 80)
                + (classCount * 200)
                + (interfaceCount * 150)
                + (enumCount * 150);
        }
        // Handle Python
        else if (languageId === 'python') {
            // For Python, use a simpler heuristic (line count + function count)
            const lines = code.split('\n').length;
            const functionCount = (code.match(/def\s+\w+/g) || []).length;
            const classCount = (code.match(/class\s+\w+/g) || []).length;
            complexity = lines + (functionCount * 50) + (classCount * 100);
        }
        // Handle other languages with basic line counting
        else {
            const lines = code.split('\n').length;
            complexity = lines * 10;
        }

        console.log('Code complexity:', complexity);
        const energy = complexity * 0.00000001;
        const carbonFootprint = energy * 475; // grams CO2 per kWh
		console.log('Carbon Foot print:', carbonFootprint);
        return carbonFootprint;
    } catch (error) {
        console.error("Error analyzing code:", error);
        return 0;
    }
}
