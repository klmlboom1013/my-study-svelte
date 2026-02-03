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
        if (!accessToken) {
            throw new Error("Drive API: No access token provided.");
        }

        const query = `name = '${filename}'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id, name)`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await handleResponse(response, "Drive List");
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
};
