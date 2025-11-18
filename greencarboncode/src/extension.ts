// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { analyzeCodeMetrics } from "./analyzer";
import { estimateEnergy } from "./energyModel";
import { estimateCarbonFromEnergy } from "./carbonModel";
import { getGreenerCodeSuggestionWithCopilot } from "./llmClient";
import { getGreenerCodeSuggestionOllama } from "./llmOllamaClient";

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
        const metrics = analyzeCodeMetrics(code);
        const { energyKWh } = estimateEnergy(metrics);
        const carbon = estimateCarbonFromEnergy(energyKWh);
    	//const score = estimateCarbon(code);
    	statusBar.text = `🌱 Carbon: ${carbon.toFixed(10)} g CO₂`;

  	});

	// Register Command
	const analyzeCommand = vscode.commands.registerCommand("carbon.analyzeCurrentFile", () => {
    	const editor = vscode.window.activeTextEditor;
    	if (!editor) {
      		vscode.window.showErrorMessage("No active text editor.");
      		return;
    	}

		const code = editor.document.getText();
        const metrics = analyzeCodeMetrics(code);
        const { energyKWh } = estimateEnergy(metrics);
        const carbon = estimateCarbonFromEnergy(energyKWh);
		//const score = estimateCarbon(code);
		console.log('Estimated Carbon Footprint:', carbon, 'g CO₂');
		vscode.window.showInformationMessage(`Estimated Carbon Footprint: ${carbon.toFixed(10)} g CO₂`);
		statusBar.text = `🌱 Carbon: ${carbon.toFixed(10)} g CO₂`;
	});

    // Register Generate Greener Code Command (Copilot)
    const generateGreenerCodeCmd = vscode.commands.registerCommand("carbon.generateGreenerCode", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active text editor.");
            return;
        }

        const document = editor.document;
        const originalCode = document.getText();
        const lang = document.languageId;

        // Analyze original code
        const oldMetrics = analyzeCodeMetrics(originalCode, lang);
        const oldEnergy = estimateEnergy(oldMetrics);
        const oldCarbon = estimateCarbonFromEnergy(oldEnergy.energyKWh);
		statusBar.text = `🌱 Old Carbon: ${oldCarbon.toFixed(10)} g CO₂`;

        // Show progress notification
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "🌱 Generating greener code with Copilot...",
                cancellable: false,
            },
            async () => {
                try {
                    console.log('[greencarbon] calling Copilot for optimized code');
                    // Call Copilot to get optimized code
					console.log('[greencarbon] originalCode length:', originalCode ? originalCode.length : 0);
                    const optimizedCode = await getGreenerCodeSuggestionWithCopilot(originalCode);
                    console.log('[greencarbon] received optimizedCode length:', optimizedCode ? optimizedCode.length : 0);

                    if (!optimizedCode) {
                        vscode.window.showErrorMessage("No optimized code returned by Copilot.");
                        return;
                    }

                    // Open optimized code in new tab
                    const newDoc = await vscode.workspace.openTextDocument({
                        content: optimizedCode,
                        language: lang,
                    });
                    await vscode.window.showTextDocument(newDoc);

                    // Analyze optimized code
                    const newMetrics = analyzeCodeMetrics(optimizedCode, lang);
                    const newEnergy = estimateEnergy(newMetrics);
                    const newCarbon = estimateCarbonFromEnergy(newEnergy.energyKWh);

                    // Show comparison
                    const carbonReduction = oldCarbon - newCarbon;
                    const percentReduction = ((carbonReduction / oldCarbon) * 100).toFixed(5);

                    vscode.window.showInformationMessage(
                        `🌿 Carbon Footprint:\nOriginal: ${oldCarbon.toFixed(10)} g CO₂\nOptimized: ${newCarbon.toFixed(10)} g CO₂\nReduction: ${percentReduction}%`
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(`Copilot Error: ${error instanceof Error ? error.message : String(error)}`);
                    console.error("Copilot Error:", error);
                }
            }
        );
    });
	
	context.subscriptions.push(analyzeCommand);
	context.subscriptions.push(generateGreenerCodeCmd);
}

// This method is called when your extension is deactivated
export function deactivate() {}


