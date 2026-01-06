import { authStore } from "./authService";
import { driveService } from "./driveService";
import { endpointService } from "./endpointService";
import { get } from "svelte/store";

let isSyncing = false;
let driveFileId: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout>;

export const syncService = {
    init: () => {
        // Listen for auth changes
        authStore.subscribe(async (user) => {
            if (user.accessToken) {
                await syncService.loadFromDrive(user.accessToken);
            } else {
                driveFileId = null;
            }
        });

        // Register generic change listener to endpointService
        // We need to modify endpointService to allow this, or poll, or use a store
        endpointService.onChange(() => {
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
                    console.log("Synced from Drive:", data.endpoints.length, "endpoints");
                }
            }
        } catch (e) {
            console.error("Sync Load Error:", e);
        } finally {
            isSyncing = false;
        }
    },

    scheduleSave: () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            syncService.saveToDrive();
        }, 2000); // 2 seconds debounce
    },

    saveToDrive: async () => {
        const user = get(authStore);
        if (!user.accessToken || isSyncing) return;

        isSyncing = true;
        try {
            const endpoints = endpointService.getEndpoints();
            const content = {
                endpoints,
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
        } finally {
            isSyncing = false;
        }
    }
};
