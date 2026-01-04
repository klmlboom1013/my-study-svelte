import type { Endpoint } from "$lib/types/endpoint";

const STORAGE_KEY = "endpoints";

export const endpointService = {
    /**
     * Save a new endpoint to localStorage
     */
    saveEndpoint: (endpoint: Endpoint): void => {
        const stored = localStorage.getItem(STORAGE_KEY);
        // Ensure read endpoints also get migrated (though less critical here if we trust the new endpoint)
        const endpoints: Endpoint[] = stored
            ? JSON.parse(stored).map((e: any) => ({
                ...e,
                application: e.application || "WPAY",
            }))
            : [];
        endpoints.push(endpoint);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
    },

    /**
     * Retrieve all endpoints from localStorage
     */
    getEndpoints: (): Endpoint[] => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        // Migration: inject default application if missing
        return parsed.map((e: any) => ({
            ...e,
            application: e.application || "WPAY",
        }));
    },

    /**
     * Clear all endpoints (for testing/cleanup)
     */
    clearEndpoints: (): void => {
        localStorage.removeItem(STORAGE_KEY);
    },

    /**
     * Delete an endpoint by ID
     */
    deleteEndpoint: (id: string): void => {
        const stored = localStorage.getItem(STORAGE_KEY);
        // Migration during read
        const endpoints: Endpoint[] = stored
            ? JSON.parse(stored).map((e: any) => ({
                ...e,
                application: e.application || "WPAY",
            }))
            : [];
        const newEndpoints = endpoints.filter((e) => e.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newEndpoints));
    },

    /**
     * Get an endpoint by ID
     */
    getEndpoint: (id: string): Endpoint | undefined => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const endpoints: Endpoint[] = stored ? JSON.parse(stored) : [];
        const endpoint = endpoints.find((e) => e.id === id);
        // Migration
        if (endpoint && !endpoint.application) {
            return { ...endpoint, application: "WPAY" };
        }
        return endpoint;
    },

    /**
     * Update an existing endpoint
     */
    updateEndpoint: (updatedEndpoint: Endpoint): void => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const endpoints: Endpoint[] = stored
            ? JSON.parse(stored).map((e: any) => ({
                ...e,
                application: e.application || "WPAY",
            }))
            : [];
        const index = endpoints.findIndex((e) => e.id === updatedEndpoint.id);

        if (index !== -1) {
            endpoints[index] = { ...updatedEndpoint, updatedAt: Date.now() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
        }
    }
};
