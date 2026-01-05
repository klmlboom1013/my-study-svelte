interface DriveFile {
    id: string;
    name: string;
}

export const driveService = {
    // List files in the App Data Folder to find a specific file
    async listFiles(accessToken: string, filename: string): Promise<DriveFile[]> {
        const query = `name = '${filename}'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=appDataFolder&fields=files(id, name)`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Drive List Error Details:", response.status, errorText);
            throw new Error(`Drive List Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
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
            throw new Error(`Drive Download Error: ${response.statusText}`);
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

        if (!response.ok) {
            throw new Error(`Drive Create Error: ${response.statusText}`);
        }

        return await response.json();
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

        if (!response.ok) {
            throw new Error(`Drive Update Error: ${response.statusText}`);
        }

        return await response.json();
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
};
