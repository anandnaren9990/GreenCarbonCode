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
        const stats = this.historyManager.getStats();

        const historyRows = history.map(insight => {
            const date = new Date(insight.timestamp).toLocaleString();
            const reductionColor = insight.reduction >= 0 ? '#4caf50' : '#f44336';
            const countBadge = insight.optimizationCount > 1 
                ? `<span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">${insight.optimizationCount}x</span>`
                : '';
            
            return `
                <tr>
                    <td>${date}</td>
                    <td>${insight.fileName}${countBadge}</td>
                    <td>${insight.language}</td>
                    <td>${insight.originalCarbon.toFixed(10)}</td>
                    <td>${insight.optimizedCarbon.toFixed(10)}</td>
                    <td style="color: ${reductionColor}; font-weight: bold;">
                        ${insight.reduction.toFixed(10)} (${insight.percentReduction}%)
                    </td>
                </tr>
            `;
        }).join('');

        // Prepare chart data
        const chartData = history.slice(0, 10).reverse().map(insight => ({
            label: insight.fileName.substring(0, 15) + (insight.fileName.length > 15 ? '...' : ''),
            original: insight.originalCarbon,
            optimized: insight.optimizedCarbon,
            reduction: insight.reduction
        }));

        const chartLabels = JSON.stringify(chartData.map(d => d.label));
        const chartOriginal = JSON.stringify(chartData.map(d => d.original.toFixed(10)));
        const chartOptimized = JSON.stringify(chartData.map(d => d.optimized.toFixed(10)));

        // Language distribution
        const languageReduction: { [key: string]: number } = {};
        history.forEach(insight => {
            languageReduction[insight.language] = (languageReduction[insight.language] || 0) + insight.reduction;
        });

        const pieLabels = JSON.stringify(Object.keys(languageReduction));
        const pieData = JSON.stringify(Object.values(languageReduction).map(v => v.toFixed(10)));
        const pieColors = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#8bc34a'];

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carbon Footprint Insights</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
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
        .charts-container {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .chart-box {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 8px;
        }
        .chart-box h3 {
            margin-top: 0;
            margin-bottom: 15px;
        }
        canvas {
            max-height: 300px;
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
        @media (max-width: 768px) {
            .charts-container {
                grid-template-columns: 1fr;
            }
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
        <div>Total Optimizations: ${stats.totalOptimizations}</div>
        <div>Unique Files: ${stats.uniqueFiles}</div>
        <div>Most Optimized: ${stats.mostOptimizedFile} (${stats.mostOptimizedCount}x)</div>
    </div>

    ${history.length > 0 ? `
        <div class="charts-container">
            <div class="chart-box">
                <h3>📊 Carbon Reduction Trend (Latest 10)</h3>
                <canvas id="barChart"></canvas>
            </div>
            <div class="chart-box">
                <h3>🥧 Reduction by Language</h3>
                <canvas id="pieChart"></canvas>
            </div>
        </div>

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

        <script>
            const textColor = getComputedStyle(document.body).getPropertyValue('--vscode-foreground');
            const gridColor = getComputedStyle(document.body).getPropertyValue('--vscode-panel-border');

            const barCtx = document.getElementById('barChart').getContext('2d');
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ${chartLabels},
                    datasets: [
                        {
                            label: 'Original CO₂',
                            data: ${chartOriginal},
                            backgroundColor: 'rgba(244, 67, 54, 0.6)',
                            borderColor: 'rgba(244, 67, 54, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Optimized CO₂',
                            data: ${chartOptimized},
                            backgroundColor: 'rgba(76, 175, 80, 0.6)',
                            borderColor: 'rgba(76, 175, 80, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: { color: textColor }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor },
                            grid: { color: gridColor }
                        },
                        y: {
                            ticks: { color: textColor },
                            grid: { color: gridColor },
                            beginAtZero: true
                        }
                    }
                }
            });

            const pieCtx = document.getElementById('pieChart').getContext('2d');
            new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ${pieLabels},
                    datasets: [{
                        data: ${pieData},
                        backgroundColor: ${JSON.stringify(pieColors)}
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: { color: textColor }
                        }
                    }
                }
            });
        </script>
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