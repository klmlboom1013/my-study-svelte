import { authStore, disconnectGoogle } from "$lib/features/auth/services/authService";
import { driveService } from "./driveService";
import { endpointService } from "$lib/features/endpoints/services/endpointService";
import { settingsStore } from "$lib/stores/settingsStore";
import { profileStore } from "$lib/stores/profileStore";
import { get } from "svelte/store";

let isSyncing = false;
let driveFileId: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout>;

import { executionService } from "$lib/features/execution/services/executionService"; // Import added
import { collectionExecutionService } from "$lib/features/execution/services/collectionExecutionService";
import { testResultService } from "$lib/features/execution/services/testResultService";

export const syncService = {
    init: () => {
        // Listen for auth changes
        authStore.subscribe(async (user) => {
            if (user.accessToken) {
                syncService.loadFromDrive(user.accessToken).catch(() => { });
            } else {
                driveFileId = null;
            }
        });

        // Register generic change listener to endpointService
        // We need to modify endpointService to allow this, or poll, or use a store
        endpointService.onChange(() => {
            syncService.scheduleSave();
        });

        // Listen for Execution History Changes (Presets)
        executionService.onChange(() => {
            syncService.scheduleSave();
        });

        // Listen for Collection Execution History Changes
        collectionExecutionService.onChange(() => {
            syncService.scheduleSave();
        });

        // Listen for Test Suite Results Changes
        testResultService.onChange(() => {
            syncService.scheduleSave();
        });

        // Listen for Settings changes
        settingsStore.subscribe(() => {
            syncService.scheduleSave();
        });

        // Listen for Profile changes
        profileStore.subscribe(() => {
            syncService.scheduleSave();
        });
    },

    loadFromDrive: async (accessToken: string) => {
        if (isSyncing) return;
        isSyncing = true;
        try {
            const files = await driveService.listFiles(accessToken, "config.json");
            const configFile = files.find((f: any) => f.name === "config.json");

            if (configFile) {
                driveFileId = configFile.id;
                const data = await driveService.downloadFile(accessToken, configFile.id);

                // 1. Load basic configuration first
                if (data.settings) {
                    settingsStore.load(data.settings);
                    console.log("Synced Settings from Drive");
                }

                if (data.profile) {
                    profileStore.updateProfile(data.profile);
                    console.log("Synced Profile from Drive");
                }

                // 2. Load data that depends on configuration
                if (data.endpoints) {
                    // Merge logic: For now, overwrite local with cloud or merge intelligently
                    // Simple strategy: Cloud wins on initial load
                    endpointService.importEndpoints(data.endpoints);
                    console.log("Synced Endpoints from Drive:", data.endpoints.length);
                }

                if (data.executionHistory) {
                    executionService.importHistory(data.executionHistory);
                    console.log("Synced Execution History from Drive");
                }

                if (data.collectionExecutionHistory) {
                    collectionExecutionService.importHistory(data.collectionExecutionHistory);
                    console.log("Synced Collection Execution History from Drive");
                }

                if (data.testSuiteResults) {
                    testResultService.importResults(data.testSuiteResults);
                    console.log("Synced Test Suite Results from Drive");
                }

                if (data.executionLogs) {
                    executionService.importExecutionLogs(data.executionLogs);
                    console.log("Synced Execution Logs from Drive");
                }
            }

            // [NEW] Scavenge individual presets that might not be in config.json yet
            const individualHistory = await driveService.scavengeIndividualCollectionPresets(accessToken);
            if (Object.keys(individualHistory).length > 0) {
                console.log(`Merging ${Object.keys(individualHistory).length} scavenged collection histories.`);
                collectionExecutionService.mergeHistory(individualHistory);
            }
        } catch (e: any) {
            console.error("Sync Load Error:", e);
            if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
                disconnectGoogle();
            }
            throw e; // Re-throw to allow caller to handle
        } finally {
            isSyncing = false;
        }
    },

    scheduleSave: () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            syncService.saveToDrive().catch(() => { });
        }, 2000); // 2 seconds debounce
    },

    saveToDrive: async () => {
        const user = get(authStore);
        if (!user.accessToken || isSyncing) return;

        isSyncing = true;
        try {
            const endpoints = endpointService.getEndpoints();
            const executionHistory = executionService.getAllHistory();
            const settings = get(settingsStore);
            const profile = get(profileStore);

            const content = {
                endpoints,
                executionHistory,
                collectionExecutionHistory: collectionExecutionService.getAllHistory(),
                testSuiteResults: testResultService.getAllResults(), // Key corrected to testSuiteResults
                executionLogs: executionService.getExecutionLogs(), // Fetch local logs for backup
                settings,
                profile,
                updatedAt: Date.now()
            };

            if (driveFileId) {
                await driveService.updateFile(user.accessToken, driveFileId, content);
            } else {
                const newFile = await driveService.createFile(user.accessToken, "config.json", content);
                driveFileId = newFile.id;
            }
            console.log("Synced to Drive");
        } catch (e: any) {
            console.error("Sync Save Error:", e);
            if (e.message?.includes("Unauthorized") || e.message?.includes("401")) {
                disconnectGoogle();
            }
            throw e; // Re-throw to allow caller to handle
        } finally {
            isSyncing = false;
        }
    },

    forceBackup: async () => {
        return await syncService.saveToDrive();
    },

    forceRestore: async () => {
        const user = get(authStore);
        if (!user.accessToken) throw new Error("Google Drive not connected");
        return await syncService.loadFromDrive(user.accessToken);
    }
};
