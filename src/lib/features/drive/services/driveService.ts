interface DriveFile {
    id: string;
    name: string;
}

const handleResponse = async (response: Response, context: string) => {
    if (!response.ok) {
        if (response.status === 401) {
            throw new Error("[401] Unauthorized: Google Drive session expired. Please re-connect.");
        }
        let errorBody = "";
        try {
            errorBody = await response.text();
        } catch (e) {
            errorBody = response.statusText;
        }
        console.error(`${context} Error:`, response.status, errorBody);
        throw new Error(`${context}: ${response.status} ${errorBody || response.statusText}`);
    }
    return response.json();
};

export const driveService = {
    // List files in the App Data Folder to find a specific file
    async listFiles(accessToken: string, filename: string): Promise<DriveFile[]> {
        return this.searchFiles(accessToken, `name = '${filename}'`);
    },

    // Search files in the App Data Folder using a custom query
    async searchFiles(accessToken: string, query: string): Promise<DriveFile[]> {
        if (!accessToken) {
            throw new Error("Drive API: No access token provided.");
        }

        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id, name)`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await handleResponse(response, "Drive Search");
        return data.files || [];
    },

    // Download file content by ID
    async downloadFile(accessToken: string, fileId: string): Promise<any> {
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("[401] Unauthorized: Google Drive session expired. Please re-connect.");
            }
            throw new Error(`Drive Download Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },

    // Create a new file in App Data Folder
    async createFile(accessToken: string, filename: string, content: any): Promise<DriveFile> {
        const metadata = {
            name: filename,
            parents: ["appDataFolder"],
        };

        const formData = new FormData();
        formData.append(
            "metadata",
            new Blob([JSON.stringify(metadata)], { type: "application/json" })
        );
        formData.append(
            "file",
            new Blob([JSON.stringify(content, null, 2)], { type: "application/json" })
        );

        const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            body: formData,
        });

        return await handleResponse(response, "Drive Create");
    },

    // Update existing file content
    async updateFile(accessToken: string, fileId: string, content: any): Promise<DriveFile> {
        const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(content, null, 2),
        });

        return await handleResponse(response, "Drive Update");
    },

    // Helper: Save Endpoints (Create or Update)
    async saveEndpoints(accessToken: string, data: any[]): Promise<void> {
        const filename = "endpoints.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            // Update the first found file
            await this.updateFile(accessToken, files[0].id, data);
        } else {
            // Create new file
            await this.createFile(accessToken, filename, data);
        }
    },

    // Helper: Load Endpoints
    async loadEndpoints(accessToken: string): Promise<any[] | null> {
        const filename = "endpoints.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            return await this.downloadFile(accessToken, files[0].id);
        }
        return null; // Not found
    },

    // Helper: Save Profile
    async saveProfile(accessToken: string, data: any): Promise<void> {
        const filename = "profile.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            // Update the first found file
            await this.updateFile(accessToken, files[0].id, data);
        } else {
            // Create new file
            await this.createFile(accessToken, filename, data);
        }
    },

    // Helper: Load Profile
    async loadProfile(accessToken: string): Promise<any | null> {
        const filename = "profile.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            return await this.downloadFile(accessToken, files[0].id);
        }
        return null; // Not found
    },

    // Helper: Save Settings
    async saveSettings(accessToken: string, data: any): Promise<void> {
        const filename = "settings.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            await this.updateFile(accessToken, files[0].id, data);
        } else {
            await this.createFile(accessToken, filename, data);
        }
    },

    // Helper: Load Settings
    async loadSettings(accessToken: string): Promise<any | null> {
        const filename = "settings.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            return await this.downloadFile(accessToken, files[0].id);
        }
        return null; // Not found
    },

    // Helper: Save Execution Logs
    async saveExecutionLogs(accessToken: string, data: any[]): Promise<void> {
        const filename = "execution_logs.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            await this.updateFile(accessToken, files[0].id, data);
        } else {
            await this.createFile(accessToken, filename, data);
        }
    },

    // Helper: Load Execution Logs
    async loadExecutionLogs(accessToken: string): Promise<any[] | null> {
        const filename = "execution_logs.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            return await this.downloadFile(accessToken, files[0].id);
        }
        return null; // Not found
    },

    // Helper: Save Execution History (Presets)
    async saveExecutionHistory(accessToken: string, data: any): Promise<void> {
        const filename = "execution_history.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            await this.updateFile(accessToken, files[0].id, data);
        } else {
            await this.createFile(accessToken, filename, data);
        }
    },

    // Helper: Load Execution History (Presets)
    async loadExecutionHistory(accessToken: string): Promise<any | null> {
        const filename = "execution_history.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            return await this.downloadFile(accessToken, files[0].id);
        }
        return null; // Not found
    },

    // Helper: Save Collection Execution History (Presets)
    async saveCollectionExecutionHistory(accessToken: string, data: any): Promise<void> {
        const filename = "collection_execution_history.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            await this.updateFile(accessToken, files[0].id, data);
        } else {
            await this.createFile(accessToken, filename, data);
        }
    },

    // Helper: Load Collection Execution History (Presets)
    async loadCollectionExecutionHistory(accessToken: string): Promise<any | null> {
        const filename = "collection_execution_history.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            return await this.downloadFile(accessToken, files[0].id);
        }
        return null; // Not found
    },

    // Helper: Save Test Suite Results (History)
    async saveTestSuiteResults(accessToken: string, data: any[]): Promise<void> {
        const filename = "test_suite_results.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            await this.updateFile(accessToken, files[0].id, data);
        } else {
            await this.createFile(accessToken, filename, data);
        }
    },

    // Helper: Load Test Suite Results (History)
    async loadTestSuiteResults(accessToken: string): Promise<any[] | null> {
        const filename = "test_suite_results.json";
        const files = await this.listFiles(accessToken, filename);

        if (files.length > 0) {
            return await this.downloadFile(accessToken, files[0].id);
        }
        return null; // Not found
    },

    /**
     * Finds all individual collection preset files (e.g., collection_presets_*.json)
     * and merges them into a single local history map.
     * This is useful for migrating old/granular backups to the new global sync system.
     */
    async scavengeIndividualCollectionPresets(accessToken: string): Promise<Record<string, any>> {
        const mergedHistory: Record<string, any> = {};
        try {
            const files = await this.searchFiles(accessToken, "name contains 'collection_presets_'");
            console.log(`Found ${files.length} individual collection preset files for scavenging.`);

            for (const file of files) {
                try {
                    const data = await this.downloadFile(accessToken, file.id);
                    if (data && data.collectionId && Array.isArray(data.presets)) {
                        mergedHistory[data.collectionId] = {
                            collectionId: data.collectionId,
                            presets: data.presets,
                            lastUsed: data.lastUsed || [],
                            selectedDashboardPresetId: data.selectedDashboardPresetId
                        };
                    }
                } catch (err) {
                    console.error(`Failed to scavenge file ${file.name} (${file.id}):`, err);
                }
            }
        } catch (err) {
            console.error("Scavenging process failed:", err);
        }
        return mergedHistory;
    },
};
