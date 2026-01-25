export interface ExecutionPreset {
    id: string;
    name: string;
    values: Record<string, any>;
    domainPrefix?: string;
    createdAt: number;
}

export interface ExecutionHistory {
    endpointId: string;
    lastUsed?: Record<string, any>;
    presets: ExecutionPreset[];
}

const STORAGE_KEY = "execution_history";

export const executionService = {
    /**
     * Get all execution history from localStorage
     */
    _getAllHistory: (): Record<string, ExecutionHistory> => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    },

    /**
     * Save all execution history to localStorage
     */
    _saveAllHistory: (historyMap: Record<string, ExecutionHistory>): void => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(historyMap));
    },

    /**
     * Get history for a specific endpoint
     */
    getHistory: (endpointId: string): ExecutionHistory => {
        const historyMap = executionService._getAllHistory();
        return historyMap[endpointId] || { endpointId, presets: [] };
    },

    /**
     * Save "Last Used" data for an endpoint
     */
    saveLastUsed: (endpointId: string, values: Record<string, any>): void => {
        const historyMap = executionService._getAllHistory();
        if (!historyMap[endpointId]) {
            historyMap[endpointId] = { endpointId, presets: [] };
        }
        historyMap[endpointId].lastUsed = values;
        executionService._saveAllHistory(historyMap);
    },

    /**
     * Save a new preset for an endpoint
     */
    savePreset: (endpointId: string, name: string, values: Record<string, any>, domainPrefix?: string): ExecutionPreset => {
        const historyMap = executionService._getAllHistory();
        if (!historyMap[endpointId]) {
            historyMap[endpointId] = { endpointId, presets: [] };
        }

        const newPreset: ExecutionPreset = {
            id: crypto.randomUUID(),
            name,
            values,
            domainPrefix,
            createdAt: Date.now()
        };

        historyMap[endpointId].presets.push(newPreset);
        executionService._saveAllHistory(historyMap);
        return newPreset;
    },

    /**
     * Delete a preset for an endpoint
     */
    deletePreset: (endpointId: string, presetId: string): void => {
        const historyMap = executionService._getAllHistory();
        if (historyMap[endpointId]) {
            historyMap[endpointId].presets = historyMap[endpointId].presets.filter(
                (p) => p.id !== presetId
            );
            executionService._saveAllHistory(historyMap);
        }
    },

    /**
     * Clear all execution history
     */
    clearAll: (): void => {
        localStorage.removeItem(STORAGE_KEY);
        notifyListeners();
    },

    /**
     * Export all history for Sync
     */
    getAllHistory: (): Record<string, ExecutionHistory> => {
        return executionService._getAllHistory();
    },

    /**
     * Import history from Sync
     */
    importHistory: (historyMap: Record<string, ExecutionHistory>): void => {
        if (!historyMap) return;
        executionService._saveAllHistory(historyMap);
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

// Wrap _saveAllHistory to trigger notification? 
// No, simpler to just call notifyListeners in public methods
const originalSaveLastUsed = executionService.saveLastUsed;
executionService.saveLastUsed = (endpointId, values) => {
    originalSaveLastUsed(endpointId, values);
    notifyListeners(); // Presets didn't change, but history did. Sync it? Yes.
};

const originalSavePreset = executionService.savePreset;
executionService.savePreset = (endpointId, name, values, domainPrefix) => {
    const result = originalSavePreset(endpointId, name, values, domainPrefix);
    notifyListeners();
    return result;
};

const originalDeletePreset = executionService.deletePreset;
executionService.deletePreset = (endpointId, presetId) => {
    originalDeletePreset(endpointId, presetId);
    notifyListeners();
};
