import type { ApiCollection } from "../../../stores/settingsStore";
import type { CollectionStepExecution } from "./collectionExecutionService";

export interface AssertionResult {
    assertionId: string;
    success: boolean;
    actualValue?: any;
    message?: string;
}

export interface StepTestResult {
    stepId: string;
    endpointId: string;
    endpointName?: string;
    status: 'PASS' | 'FAIL' | 'ERROR';
    assertions: AssertionResult[];
    latency: number;
    timestamp: number;
    error?: string;
}

export interface CollectionTestResult {
    id: string; // Unique result instance ID
    collectionId: string;
    collectionName: string;
    status: 'PASS' | 'FAIL' | 'ERROR';
    steps: StepTestResult[];
    passedSteps: number;
    totalSteps: number;
    timestamp: number;
    duration: number;
}

const STORAGE_KEY = "test_suite_results";
const MAX_RESULTS = 100; // Limit stored results

export const testResultService = {
    /**
     * Get all test results from localStorage
     */
    getAllResults: (): CollectionTestResult[] => {
        if (typeof localStorage === 'undefined') return [];
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    /**
     * Save a new test result
     */
    recordResult: (result: CollectionTestResult): void => {
        const results = testResultService.getAllResults();
        results.unshift(result); // Add to the beginning

        // Trim results to limit
        const trimmedResults = results.slice(0, MAX_RESULTS);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedResults));
        notifyListeners();
    },

    /**
     * Create and record a result from active execution steps
     */
    recordFromExecution: (collection: ApiCollection, steps: CollectionStepExecution[]): void => {
        const stepResults: StepTestResult[] = steps.map(s => ({
            stepId: s.stepId,
            endpointId: s.endpointId,
            endpointName: s.endpointName,
            status: s.status === 'SUCCESS' ? 'PASS' : 'FAIL',
            assertions: (s.assertionResults || []).map(ar => ({
                assertionId: ar.assertionId,
                success: ar.success,
                actualValue: ar.actualValue,
                message: ar.message
            })),
            latency: s.latency || 0,
            timestamp: Date.now(),
            error: s.error
        }));

        const passedSteps = stepResults.filter(s => s.status === 'PASS').length;
        const overallStatus = passedSteps === stepResults.length ? 'PASS' : 'FAIL';
        const totalDuration = stepResults.reduce((sum, s) => sum + s.latency, 0);

        const result: CollectionTestResult = {
            id: `tr_${Date.now()}`,
            collectionId: collection.id,
            collectionName: collection.name,
            status: overallStatus,
            steps: stepResults,
            passedSteps,
            totalSteps: stepResults.length,
            timestamp: Date.now(),
            duration: totalDuration
        };

        testResultService.recordResult(result);
    },

    /**
     * Get results for a specific collection
     */
    getResultsByCollection: (collectionId: string): CollectionTestResult[] => {
        return testResultService.getAllResults().filter(r => r.collectionId === collectionId);
    },

    /**
     * Delete a specific result record
     */
    deleteResult: (id: string): void => {
        const results = testResultService.getAllResults().filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
        notifyListeners();
    },

    /**
     * Clear all results
     */
    clearAll: (): void => {
        localStorage.removeItem(STORAGE_KEY);
        notifyListeners();
    },

    /**
     * Import results (for Sync)
     */
    importResults: (results: CollectionTestResult[]): void => {
        if (!results) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
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
