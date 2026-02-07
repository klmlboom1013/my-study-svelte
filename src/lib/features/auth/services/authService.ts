import { auth } from "$lib/firebase/firebase";
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    type User,
} from "firebase/auth";
import { writable } from "svelte/store";

// Extended User type to include the Google OAuth Access Token
export interface AuthUser {
    firebaseUser: User | null;
    accessToken: string | null;
}

// Initial state from sessionStorage if available
const savedToken = typeof window !== "undefined" ? sessionStorage.getItem("googleDriveAccessToken") : null;

export const authStore = writable<AuthUser>({
    firebaseUser: null,
    accessToken: savedToken,
});

// Initialize Auth State Listener
export const initAuth = () => {
    onAuthStateChanged(auth, (user) => {
        authStore.update((curr) => {
            return {
                ...curr,
                firebaseUser: user,
            };
        });
    });
};



export const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Scope for Application Data Folder (hidden from user's main drive view)
    provider.addScope("https://www.googleapis.com/auth/drive.appdata");

    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken || null;



        if (token) {
            sessionStorage.setItem("googleDriveAccessToken", token);
        }

        authStore.update((curr) => ({
            ...curr,
            firebaseUser: result.user,
            accessToken: token,
        }));

        return { user: result.user, token };
    } catch (error) {
        console.error("Login failed:", error);
        throw error;
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
        sessionStorage.removeItem("googleDriveAccessToken");
        authStore.set({ firebaseUser: null, accessToken: null });
    } catch (error) {
        console.error("Logout failed:", error);
    }
};

export const disconnectGoogle = () => {
    sessionStorage.removeItem("googleDriveAccessToken");
    authStore.update((curr) => ({
        ...curr,
        accessToken: null,
    }));
};

/**
 * Checks if Google Drive is connected (access token exists)
 */
import { get } from "svelte/store";
export const checkDriveConnection = (): boolean => {
    return !!get(authStore).accessToken;
};
