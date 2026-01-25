import { authStore } from "./authService";
import { driveService } from "./driveService";
import { endpointService } from "./endpointService";
import { get } from "svelte/store";

let isSyncing = false;
let driveFileId: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout>;

import { executionService } from "./executionService"; // Import added

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
            }
        } catch (e) {
            console.error("Sync Load Error:", e);
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

            const content = {
                endpoints,
                executionHistory,
                updatedAt: Date.now()
            };

            if (driveFileId) {
                await driveService.updateFile(user.accessToken, driveFileId, content);
            } else {
                const newFile = await driveService.createFile(user.accessToken, "config.json", content);
                driveFileId = newFile.id;
            }
            console.log("Synced to Drive");
        } catch (e) {
            console.error("Sync Save Error:", e);
            throw e; // Re-throw to allow caller to handle
        } finally {
            isSyncing = false;
        }
    }
};
