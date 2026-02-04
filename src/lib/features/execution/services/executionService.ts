import { get } from 'svelte/store';
import { settingsStore } from '$lib/stores/settingsStore';

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

export interface ExecutionLog {
    id: string;
    endpointId: string;
    endpointName: string;
    timestamp: number;
    status: 'success' | 'error' | 'warning' | 'info';
    statusCode?: number;
    method?: string;
    url?: string;
    duration?: number;
    requestData?: any;
    responseData?: any;
    queryParams?: Record<string, string>;
    headers?: Record<string, string>;
    application?: string;
    service?: string;
    site?: string;
}

const STORAGE_KEY = "execution_history";
const LOG_STORAGE_KEY = "execution_logs";
const MAX_LOGS = 50;

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
     * Record a new execution log
     */
    recordExecution: (log: Omit<ExecutionLog, 'id' | 'timestamp'>): void => {
        const logs = executionService.getExecutionLogs();
        const newLog: ExecutionLog = {
            ...log,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };

        logs.unshift(newLog);

        // Limit to maxLogCount from settings
        const settings = get(settingsStore);
        const maxLogs = settings.recentActivity?.maxLogCount ?? 50;
        const limitedLogs = logs.slice(0, maxLogs);
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(limitedLogs));
        notifyListeners();
    },

    /**
     * Get all execution logs
     */
    getExecutionLogs: (): ExecutionLog[] => {
        const stored = localStorage.getItem(LOG_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    /**
     * Clear all execution logs
     */
    clearExecutionLogs: (): void => {
        localStorage.removeItem(LOG_STORAGE_KEY);
        notifyListeners();
    },

    /**
     * Import execution logs from Sync
     */
    importExecutionLogs: (newLogs: ExecutionLog[]): void => {
        if (!Array.isArray(newLogs)) return;
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(newLogs));
        notifyListeners();
    },

    /**
     * Delete a specific execution log
     */
    deleteExecutionLog: (logId: string): void => {
        const logs = executionService.getExecutionLogs();
        const filteredLogs = logs.filter(l => l.id !== logId);
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(filteredLogs));
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
