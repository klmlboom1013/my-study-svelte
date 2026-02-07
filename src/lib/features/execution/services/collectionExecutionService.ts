import type { AssertionResult } from "./testResultService";

export interface CollectionStepExecution {
    stepId: string;
    endpointId: string;
    requestValues: Record<string, any>;
    status: 'READY' | 'EXECUTING' | 'SUCCESS' | 'ERROR';
    error?: string;
    result?: any;
    sentRequest?: string;
    domainPrefix?: string;
    signatureSourceString?: string;
    processedResult?: Record<string, any>;
    // New fields for signature display
    responseSignatureRawString?: string;
    responseCalculatedSignature?: string;
    responseValidationSuccess?: boolean;
    normalizedResult?: any; // Recursively processed (decrypted/decoded) result for mapping
    mappedOptions?: Record<string, any[]>; // Dynamic options provided by mapping
    requestUrl?: string; // Final URL used for the request
    assertionResults?: AssertionResult[]; // Results of test assertions
    latency?: number; // Response time in ms
    endpointName?: string; // Display name of the endpoint
}

export interface CollectionExecutionPreset {
    id: string;
    name: string;
    collectionId: string;
    steps: CollectionStepExecution[];
    createdAt: number;
}

export interface CollectionExecutionHistory {
    collectionId: string;
    lastUsed?: {
        steps: CollectionStepExecution[];
    };
    presets: CollectionExecutionPreset[];
    selectedDashboardPresetId?: string; // Persist selected preset for dashboard
}

const STORAGE_KEY = "collection_execution_history";

export const collectionExecutionService = {
    /**
     * Get all collection execution history from localStorage
     */
    _getAllHistory: (): Record<string, CollectionExecutionHistory> => {
        if (typeof localStorage === 'undefined') return {};
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    },

    /**
     * Save all collection execution history to localStorage
     */
    _saveAllHistory: (historyMap: Record<string, CollectionExecutionHistory>): void => {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(historyMap));
        notifyListeners();
    },

    /**
     * Get history for a specific collection
     */
    getHistory: (collectionId: string): CollectionExecutionHistory => {
        const historyMap = collectionExecutionService._getAllHistory();
        return historyMap[collectionId] || { collectionId, presets: [] };
    },

    /**
     * Save "Last Used" data for a collection
     */
    saveLastUsed: (collectionId: string, steps: CollectionStepExecution[]): void => {
        const historyMap = collectionExecutionService._getAllHistory();
        if (!historyMap[collectionId]) {
            historyMap[collectionId] = { collectionId, presets: [] };
        }
        historyMap[collectionId].lastUsed = { steps };
        collectionExecutionService._saveAllHistory(historyMap);
    },

    /**
     * Save a new preset for a collection
     */
    savePreset: (collectionId: string, name: string, steps: CollectionStepExecution[]): CollectionExecutionPreset => {
        const historyMap = collectionExecutionService._getAllHistory();
        if (!historyMap[collectionId]) {
            historyMap[collectionId] = { collectionId, presets: [] };
        }

        const newPreset: CollectionExecutionPreset = {
            id: crypto.randomUUID(),
            name,
            collectionId,
            steps: steps.map(s => ({ ...s, result: undefined, status: 'READY', error: undefined })), // Don't save results in presets? Or do? Req says "reuse history".
            createdAt: Date.now()
        };

        historyMap[collectionId].presets.push(newPreset);
        collectionExecutionService._saveAllHistory(historyMap);
        return newPreset;
    },

    /**
     * Delete a preset for a collection
     */
    deletePreset: (collectionId: string, presetId: string): void => {
        const historyMap = collectionExecutionService._getAllHistory();
        if (historyMap[collectionId]) {
            historyMap[collectionId].presets = historyMap[collectionId].presets.filter(
                (p) => p.id !== presetId
            );
            collectionExecutionService._saveAllHistory(historyMap);
        }
    },

    /**
     * Save selected preset for dashboard
     */
    saveDashboardPreset: (collectionId: string, presetId: string): void => {
        const historyMap = collectionExecutionService._getAllHistory();
        if (!historyMap[collectionId]) {
            historyMap[collectionId] = { collectionId, presets: [] };
        }
        historyMap[collectionId].selectedDashboardPresetId = presetId;
        collectionExecutionService._saveAllHistory(historyMap);
    },

    /**
     * Clear all collection execution history
     */
    clearAll: (): void => {
        localStorage.removeItem(STORAGE_KEY);
        notifyListeners();
    },

    /**
     * Export all history for Sync
     */
    getAllHistory: (): Record<string, CollectionExecutionHistory> => {
        return collectionExecutionService._getAllHistory();
    },

    /**
     * Import history from Sync (Overwrites entire history)
     */
    importHistory: (historyMap: Record<string, CollectionExecutionHistory>): void => {
        if (!historyMap) return;
        collectionExecutionService._saveAllHistory(historyMap);
    },

    /**
     * Merge history from Sync (Preserves existing data if not in incoming)
     */
    mergeHistory: (historyMap: Record<string, CollectionExecutionHistory>): void => {
        if (!historyMap) return;
        const current = collectionExecutionService._getAllHistory();
        const merged = { ...current };

        Object.entries(historyMap).forEach(([id, data]) => {
            if (!merged[id]) {
                merged[id] = data;
            } else {
                // Merge presets and other fields selectively
                merged[id] = {
                    ...merged[id],
                    // Only update these if incoming data has them
                    ...(data.selectedDashboardPresetId ? { selectedDashboardPresetId: data.selectedDashboardPresetId } : {}),
                    ...(data.lastUsed ? { lastUsed: data.lastUsed } : {}),
                    presets: [...(merged[id].presets || []), ...(data.presets || [])].reduce((acc, p) => {
                        if (!acc.find(x => x.id === p.id)) acc.push(p);
                        return acc;
                    }, [] as any[])
                };
            }
        });

        collectionExecutionService._saveAllHistory(merged);
    },

    /**
     * Subscribe to changes
     */
    onChange: (callback: () => void): (() => void) => {
        listeners.push(callback);
        return () => {
            listeners = listeners.filter((l) => l !== callback);
        };
    }
};

// Internal Observer Logic
let listeners: (() => void)[] = [];
const notifyListeners = () => {
    listeners.forEach((l) => l());
};
