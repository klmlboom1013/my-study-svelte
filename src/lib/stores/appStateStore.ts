import { writable } from "svelte/store";

export const appStateStore = writable({
    selectedApp: "All", // Default value
});
