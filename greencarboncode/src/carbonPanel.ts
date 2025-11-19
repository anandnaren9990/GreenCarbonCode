import * as vscode from 'vscode';
import CarbonHistoryManager, { CarbonInsight } from './carbonHistory';

export class CarbonInsightsPanel {
    public static currentPanel: CarbonInsightsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private historyManager: CarbonHistoryManager;

    private constructor(panel: vscode.WebviewPanel, historyManager: CarbonHistoryManager) {
        this._panel = panel;
        this.historyManager = historyManager;

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(context: vscode.ExtensionContext, historyManager: CarbonHistoryManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (CarbonInsightsPanel.currentPanel) {
            CarbonInsightsPanel.currentPanel._panel.reveal(column);
            CarbonInsightsPanel.currentPanel._update();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'carbonInsights',
            'Carbon Footprint Insights',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        CarbonInsightsPanel.currentPanel = new CarbonInsightsPanel(panel, historyManager);
    }

    public dispose() {
        CarbonInsightsPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Carbon Footprint Insights';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const history = this.historyManager.getHistory();
        const totalReduction = this.historyManager.getTotalReduction();

        const historyRows = history.map(insight => {
            const date = new Date(insight.timestamp).toLocaleString();
            const reductionColor = insight.reduction >= 0 ? '#4caf50' : '#f44336';
            
            return `
                <tr>
                    <td>${date}</td>
                    <td>${insight.fileName}</td>
                    <td>${insight.language}</td>
                    <td>${insight.originalCarbon.toFixed(8)}</td>
                    <td>${insight.optimizedCarbon.toFixed(8)}</td>
                    <td style="color: ${reductionColor}; font-weight: bold;">
                        ${insight.reduction.toFixed(8)} (${insight.percentReduction}%)
                    </td>
                </tr>
            `;
        }).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carbon Footprint Insights</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 10px;
        }
        .summary {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .summary h2 {
            margin-top: 0;
        }
        .stat {
            font-size: 24px;
            font-weight: bold;
            color: #4caf50;
            margin: 10px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        th {
            background-color: var(--vscode-editor-selectionBackground);
            font-weight: bold;
        }
        tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        .icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <h1>🌱 Carbon Footprint Insights</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="stat">
            Total Carbon Reduced: ${totalReduction.toFixed(8)} g CO₂
        </div>
        <div>Total Optimizations: ${history.length}</div>
    </div>

    ${history.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>File</th>
                    <th>Language</th>
                    <th>Original (g CO₂)</th>
                    <th>Optimized (g CO₂)</th>
                    <th>Reduction</th>
                </tr>
            </thead>
            <tbody>
                ${historyRows}
            </tbody>
        </table>
    ` : `
        <div class="empty-state">
            <div class="icon">📊</div>
            <h3>No optimization history yet</h3>
            <p>Run "Generate Greener Code" to start tracking your carbon footprint reductions.</p>
        </div>
    `}
</body>
</html>`;
    }
}