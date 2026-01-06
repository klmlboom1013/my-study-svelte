import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ProfileData {
    userId?: string;
    avatarUrl?: string;
    // Add other fields as needed for global access, 
    // but for UserMenu, userId and avatarUrl are primary.
    [key: string]: any;
}

const initialState: ProfileData = {
    userId: 'Guest',
    avatarUrl: ''
};

function createProfileStore() {
    const { subscribe, set, update } = writable<ProfileData>(initialState);

    return {
        subscribe,
        // Initialize from localStorage (browser only)
        init: () => {
            if (browser) {
                try {
                    const profileStored = localStorage.getItem("profile");

                    if (profileStored) {
                        // Load from profile
                        set(JSON.parse(profileStored));
                    } else {
                        // Migration: Check sign-in-page if profile is missing
                        const signInStored = localStorage.getItem("sign-in-page");
                        if (signInStored) {
                            const parsed = JSON.parse(signInStored);
                            const initialProfile: ProfileData = {
                                userId: parsed.userId || "Guest",
                                avatarUrl: parsed.avatarUrl || "",
                                // Copy other potential fields if they existed there during transition
                                company: parsed.company,
                                team: parsed.team,
                                jobTitle: parsed.jobTitle,
                                jobCategory: parsed.jobCategory,
                                nickname: parsed.nickname,
                                applications: parsed.applications
                            };

                            // Clean undefined fields
                            Object.keys(initialProfile).forEach(key =>
                                initialProfile[key] === undefined && delete initialProfile[key]
                            );

                            set(initialProfile);
                            // Persist to new location
                            localStorage.setItem("profile", JSON.stringify(initialProfile));
                        }
                    }
                } catch (e) {
                    console.error("Failed to load profile from localStorage", e);
                }
            }
        },
        // Update both store and localStorage
        updateProfile: (data: ProfileData) => {
            update(state => {
                const newState = { ...state, ...data };
                if (browser) {
                    localStorage.setItem("profile", JSON.stringify(newState));
                }
                return newState;
            });
        }
    };
}

export const profileStore = createProfileStore();

// Auto-initialize in browser
if (browser) {
    profileStore.init();
}
