import * as vscode from 'vscode';

export interface CarbonInsight {
    timestamp: number;
    fileName: string;
    language: string;
    originalCarbon: number;
    optimizedCarbon: number;
    reduction: number;
    percentReduction: string;
}

class CarbonHistoryManager {
    private history: CarbonInsight[] = [];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadHistory();
    }

    private loadHistory() {
        const saved = this.context.globalState.get<CarbonInsight[]>('carbonHistory', []);
        this.history = saved;
    }

    private saveHistory() {
        this.context.globalState.update('carbonHistory', this.history);
    }

    addInsight(insight: CarbonInsight) {
        this.history.unshift(insight); // Add to beginning
        // Keep only last 50 entries
        if (this.history.length > 50) {
            this.history = this.history.slice(0, 50);
        }
        this.saveHistory();
    }

    getHistory(): CarbonInsight[] {
        return this.history;
    }

    clearHistory() {
        this.history = [];
        this.saveHistory();
    }

    getTotalReduction(): number {
        return this.history.reduce((sum, insight) => sum + insight.reduction, 0);
    }
}

export default CarbonHistoryManager;