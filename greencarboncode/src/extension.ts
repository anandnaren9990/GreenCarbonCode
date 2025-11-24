// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { analyzeCodeMetrics } from "./analyzer";
import { estimateEnergy } from "./energyModel";
import { estimateCarbonFromEnergy } from "./carbonModel";
import { getGreenerCodeSuggestionWithCopilot, clearCodeCache, generateTestCasesWithCopilot, generateExplanationWithCopilot, getOptimizedArchitectureWithCopilot } from "./llmClient";
import CarbonHistoryManager from './carbonHistory';
import { CarbonInsightsPanel } from './carbonPanel';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "greencarboncode" is now active!');

    // Initialize history manager
    const historyManager = new CarbonHistoryManager(context);

    // Create a status bar item
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBar.text = "🌱 Carbon: --";
    statusBar.show();

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
        console.log('Estimated Carbon Footprint:', carbon, 'g CO₂');
        vscode.window.showInformationMessage(`Estimated Carbon Footprint: ${carbon.toFixed(10)} g CO₂`);
        statusBar.text = `🌱 Carbon: ${carbon.toFixed(10)} g CO₂`;
    });

    const optimizeArchitectureCmd = vscode.commands.registerCommand("carbon.optimizeArchitecture", async () => {
    const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: "Select Architecture Document",
        filters: {
            'Text or Markdown': ['txt', 'md'],
            'All Files': ['*']
        }
    });
    if (!uris || uris.length === 0) {
        vscode.window.showInformationMessage("No architecture document selected.");
        return;
    }
    const docUri = uris[0];
    try {
        const doc = await vscode.workspace.openTextDocument(docUri);
        const architectureText = doc.getText();
        if (!architectureText || architectureText.trim().length === 0) {
            vscode.window.showWarningMessage("The selected document is empty.");
            return;
        }
        vscode.window.showInformationMessage("Optimizing architecture document...");

        const optimizedText = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "🌱 Optimizing architecture with Copilot...",
                cancellable: false,
            },
            async () => {
                return await getOptimizedArchitectureWithCopilot(architectureText);
            }
        );

        if (!optimizedText) {
            vscode.window.showErrorMessage("No optimized architecture returned.");
            return;
        }

        const newDoc = await vscode.workspace.openTextDocument({
            content: optimizedText,
            language: doc.languageId || 'markdown',
        });
        await vscode.window.showTextDocument(newDoc, vscode.ViewColumn.Beside);

        vscode.window.showInformationMessage("✅ Optimized architecture generated!");
    } catch (err) {
        vscode.window.showErrorMessage("Failed to optimize the selected document.");
    }
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
        const fileName = document.fileName.split(/[\\/]/).pop() || 'untitled';

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
                    statusBar.text = `🌱 New Carbon: ${newCarbon.toFixed(10)} g CO₂`;
                    // Show comparison
                    const carbonReduction = oldCarbon - newCarbon;
                    const percentReduction = ((carbonReduction / oldCarbon) * 100).toFixed(5);
                    console.log('[greencarbon] Old Carbon:', oldCarbon, 'g CO₂');
                    console.log('[greencarbon] New Carbon:', newCarbon, 'g CO₂');
                    console.log('[greencarbon] Carbon Reduction:', carbonReduction, 'g CO₂');
                    console.log('[greencarbon] Percent Reduction:', percentReduction, '%');

                    // Save to history with original code for frequency tracking
                    historyManager.addInsight({
                        timestamp: Date.now(),
                        fileName: fileName,
                        language: lang,
                        originalCarbon: oldCarbon,
                        optimizedCarbon: newCarbon,
                        reduction: carbonReduction,
                        percentReduction: percentReduction,
                    }, originalCode); // Pass original code for hash generation

                    // Check how many times this code has been optimized
                    const optimizationCount = historyManager.getOptimizationCount(originalCode);
                    
                    if (optimizationCount > 1) {
                        vscode.window.showInformationMessage(
                            `ℹ️ This code has been optimized ${optimizationCount} times before.`
                        );
                    }

                    vscode.window.showInformationMessage(
                        `🌿 Carbon Footprint:\nOriginal: ${oldCarbon.toFixed(10)} g CO₂\nOptimized: ${newCarbon.toFixed(10)} g CO₂\nReduction: ${percentReduction}%`
                    );
                    
                                        // Generate explanation of differences
                    console.log('[greencarbon] Generating explanation of optimizations...');
                    vscode.window.showInformationMessage("📝 Generating explanation of optimizations...");
                    
                    try {
                        const explanation = await generateExplanationWithCopilot(originalCode, optimizedCode, lang);
                        console.log('[greencarbon] Received explanation length:', explanation ? explanation.length : 0);

                        if (explanation) {
                            // Open explanation in a new editor
                            const explanationDoc = await vscode.workspace.openTextDocument({
                                content: `# Optimization Explanation\n\n${explanation}\n\n---\n\n## Carbon Footprint Comparison\n- Original: ${oldCarbon.toFixed(10)} g CO₂\n- Optimized: ${newCarbon.toFixed(10)} g CO₂\n- Reduction: ${carbonReduction.toFixed(10)} g CO₂ (${percentReduction}%)`,
                                language: 'markdown',
                            });
                            await vscode.window.showTextDocument(explanationDoc, vscode.ViewColumn.Beside);
                            
                            vscode.window.showInformationMessage("✅ Explanation generated!");
                        }
                    } catch (explainError) {
                        console.error('[greencarbon] Explanation generation error:', explainError);
                        vscode.window.showWarningMessage("⚠️ Failed to generate explanation.");
                    }

                    // Generate test cases for the optimized code
                    console.log('[greencarbon] Generating test cases for optimized code...');
                    vscode.window.showInformationMessage("🧪 Generating test cases for optimized code...");
                    
                    try {
                        const testCases = await generateTestCasesWithCopilot(optimizedCode, lang);
                        console.log('[greencarbon] Received test cases length:', testCases ? testCases.length : 0);

                        if (testCases) {
                            const testDoc = await vscode.workspace.openTextDocument({
                                content: testCases,
                                language: lang,
                            });
                            await vscode.window.showTextDocument(testDoc, vscode.ViewColumn.Two);
                            
                            vscode.window.showInformationMessage("✅ Test cases generated successfully!");
                        } else {
                            vscode.window.showWarningMessage("⚠️ No test cases were generated.");
                        }
                    } catch (testError) {
                        console.error('[greencarbon] Test generation error:', testError);
                        vscode.window.showWarningMessage("⚠️ Failed to generate test cases, but optimized code is ready.");
                    }

                } catch (error) {
                    vscode.window.showErrorMessage(`Copilot Error: ${error instanceof Error ? error.message : String(error)}`);
                    console.error("Copilot Error:", error);
                }
            }
        );
    });

    // Register command to show insights panel
    const showInsightsCmd = vscode.commands.registerCommand("carbon.showInsights", () => {
        CarbonInsightsPanel.createOrShow(context, historyManager);
    });

    // Register command to clear history
    const clearHistoryCmd = vscode.commands.registerCommand("carbon.clearHistory", () => {
        historyManager.clearHistory();
        vscode.window.showInformationMessage("Carbon footprint history cleared!");
    });
    
    context.subscriptions.push(analyzeCommand);
    context.subscriptions.push(generateGreenerCodeCmd);
    context.subscriptions.push(showInsightsCmd);
    context.subscriptions.push(clearHistoryCmd);
    context.subscriptions.push(optimizeArchitectureCmd);


    // Register Clear Code Cache Command
    const clearCacheCmd = vscode.commands.registerCommand("carbon.clearCache", () => {
        clearCodeCache();
        vscode.window.showInformationMessage("Copilot cache cleared!");
    });
    
    context.subscriptions.push(clearCacheCmd);
}

// This method is called when your extension is deactivated
export function deactivate() {}