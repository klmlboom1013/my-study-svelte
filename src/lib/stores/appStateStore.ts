import { writable } from "svelte/store";
import { browser } from "$app/environment";

const initialState = {
    selectedApp: "All",
    isPageLocked: true, // Default to locked
    globalAlert: null as { title: string; message: string; type?: "alert" | "confirm"; onConfirm?: () => void } | null,
};

// Initialize from localStorage if in browser
const storedState = browser ? localStorage.getItem("appState") : null;
const parsedState = storedState ? JSON.parse(storedState) : initialState;

export const appStateStore = writable(parsedState);

// Persist to localStorage on change
if (browser) {
    appStateStore.subscribe((state) => {
        localStorage.setItem("appState", JSON.stringify(state));
    });
}
