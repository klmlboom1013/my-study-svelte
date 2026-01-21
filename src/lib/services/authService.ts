import { auth } from "../firebase/firebase";
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

export const authStore = writable<AuthUser>({
    firebaseUser: null,
    accessToken: null,
});

// Initialize Auth State Listener
export const initAuth = () => {
    onAuthStateChanged(auth, (user) => {
        authStore.update((curr) => {
            // Try to restore token from storage if user exists but token is missing
            let token = curr.accessToken;
            if (user && !token) {
                token = loadToken();
            }

            return {
                ...curr,
                firebaseUser: user,
                accessToken: token,
            };
        });
    });
};

const TOKEN_KEY = "google_access_token";

const saveToken = (token: string) => {
    if (typeof localStorage !== "undefined") {
        localStorage.setItem(TOKEN_KEY, token);
    }
};

const clearToken = () => {
    if (typeof localStorage !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
    }
};

const loadToken = (): string | null => {
    if (typeof localStorage !== "undefined") {
        return localStorage.getItem(TOKEN_KEY);
    }
    return null;
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
            saveToken(token);
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
        clearToken();
        authStore.set({ firebaseUser: null, accessToken: null });
    } catch (error) {
        console.error("Logout failed:", error);
    }
};
