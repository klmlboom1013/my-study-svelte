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
     * Clear all collection execution history
     */
    clearAll: (): void => {
        localStorage.removeItem(STORAGE_KEY);
        notifyListeners();
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
