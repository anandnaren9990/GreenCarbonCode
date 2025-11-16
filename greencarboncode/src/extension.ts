// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { analyzeCodeMetrics } from "./analyzer";
import { estimateEnergy } from "./energyModel";
import { estimateCarbonFromEnergy } from "./carbonModel";

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
    	statusBar.text = `🌱 Carbon: ${carbon.toFixed(7)} g CO₂`;

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
		vscode.window.showInformationMessage(`Estimated Carbon Footprint: ${carbon.toFixed(5)} g CO₂`);
	});

	context.subscriptions.push(analyzeCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}


