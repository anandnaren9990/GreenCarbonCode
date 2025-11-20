import * as vscode from 'vscode';

export interface CarbonInsight {
    timestamp: number;
    fileName: string;
    language: string;
    originalCarbon: number;
    optimizedCarbon: number;
    reduction: number;
    percentReduction: string;
    codeHash: string; // Add hash to identify duplicate code
    optimizationCount: number; // Track how many times this code was optimized
}

class CarbonHistoryManager {
    private history: CarbonInsight[] = [];
    private context: vscode.ExtensionContext;
    private codeFrequency: Map<string, number> = new Map(); // Track code optimization frequency

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadHistory();
        this.buildFrequencyMap();
    }

    private loadHistory() {
        const saved = this.context.globalState.get<CarbonInsight[]>('carbonHistory', []);
        this.history = saved;
    }

    private saveHistory() {
        this.context.globalState.update('carbonHistory', this.history);
    }

    private buildFrequencyMap() {
        this.codeFrequency.clear();
        this.history.forEach(insight => {
            const count = this.codeFrequency.get(insight.codeHash) || 0;
            this.codeFrequency.set(insight.codeHash, count + 1);
        });
    }

    // Simple hash function for code
    private hashCode(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    addInsight(insight: Omit<CarbonInsight, 'codeHash' | 'optimizationCount'>, originalCode: string) {
        const codeHash = this.hashCode(originalCode);
        const currentCount = this.codeFrequency.get(codeHash) || 0;
        const newCount = currentCount + 1;
        
        // Update frequency map
        this.codeFrequency.set(codeHash, newCount);

        // Create full insight with hash and count
        const fullInsight: CarbonInsight = {
            ...insight,
            codeHash: codeHash,
            optimizationCount: newCount
        };

        this.history.unshift(fullInsight); // Add to beginning
        
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
        this.codeFrequency.clear();
        this.saveHistory();
    }

    getTotalReduction(): number {
        return this.history.reduce((sum, insight) => sum + insight.reduction, 0);
    }

    // Get optimization count for specific code
    getOptimizationCount(code: string): number {
        const hash = this.hashCode(code);
        return this.codeFrequency.get(hash) || 0;
    }

    // Get most frequently optimized code
    getMostOptimizedCode(): { codeHash: string; count: number; insight: CarbonInsight | undefined } | null {
        if (this.codeFrequency.size === 0) {
            return null;
        }

        let maxCount = 0;
        let maxHash = '';
        
        this.codeFrequency.forEach((count, hash) => {
            if (count > maxCount) {
                maxCount = count;
                maxHash = hash;
            }
        });

        const insight = this.history.find(h => h.codeHash === maxHash);
        
        return {
            codeHash: maxHash,
            count: maxCount,
            insight: insight
        };
    }

    // Get statistics
    getStats() {
        const uniqueFiles = new Set(this.history.map(h => h.fileName)).size;
        const totalOptimizations = this.history.length;
        const mostOptimized = this.getMostOptimizedCode();
        
        return {
            totalOptimizations,
            uniqueFiles,
            totalReduction: this.getTotalReduction(),
            mostOptimizedFile: mostOptimized?.insight?.fileName || 'N/A',
            mostOptimizedCount: mostOptimized?.count || 0
        };
    }
}

export default CarbonHistoryManager;