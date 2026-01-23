import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface ProfileData {
    id: string;
    saveDateTime?: string;
    backupDateTime?: string;
    restoreDateTime?: string;
    basicInfo: {
        userId: string;
        nickname: string;
        avatarUrl: string;
    };
    testerInformation: {
        company: string;
        team: string;
        position: string;
        role: string;
    };
    myApplications: {
        id: string; // Internal ID for UI rendering keys
        appName: string;
        description: string;
        useServiceDistinction?: boolean;
        domains?: {
            dev?: string;
            stg?: string;
            pGlb?: string;
            pKs?: string;
            pFc?: string;
        };
        services?: {
            id: string;
            name: string; // e.g. wpaystd
            domains: {
                dev?: string;
                stg?: string;
                pGlb?: string;
                pKs?: string;
                pFc?: string;
            };
        }[];
    }[];
    [key: string]: any; // Allow legacy properties during migration
}

const initialState: ProfileData = {
    id: '',
    basicInfo: {
        userId: 'Guest',
        nickname: '',
        avatarUrl: ''
    },
    testerInformation: {
        company: '',
        team: '',
        position: '',
        role: ''
    },
    myApplications: []
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
                        const parsed = JSON.parse(profileStored);
                        // Simple validation or migration could go here if needed
                        // For now assumig we will overwrite/refactor, but to be safe for existing data:
                        // We might need to migrate old flat structure to new nested if it exists?
                        // Given the user said "restore from drive" is the main way, we can start fresh or try to map.
                        // Let's blindly load if it looks like the new structure, else partial map.

                        if (parsed.basicInfo) {
                            set(parsed);
                        } else {
                            // Migration from flat to nested (temporary fallback)
                            set({
                                id: parsed.id || '',
                                basicInfo: {
                                    userId: parsed.userId || 'Guest',
                                    nickname: parsed.nickname || '',
                                    avatarUrl: parsed.avatarUrl || ''
                                },
                                testerInformation: {
                                    company: parsed.company || '',
                                    team: parsed.team || '',
                                    position: parsed.jobTitle || '',
                                    role: parsed.jobCategory || ''
                                },
                                myApplications: parsed.applications ? parsed.applications.map((app: any) => ({
                                    id: app.id || crypto.randomUUID(),
                                    appName: app.name || '',
                                    description: app.description || ''
                                })) : []
                            });
                        }
                    } else {
                        // Check legacy sign-in only if really needed, but maybe better to start clean as Guest
                        const signInStored = localStorage.getItem("sign-in-page");
                        if (signInStored) {
                            const parsed = JSON.parse(signInStored);
                            set({
                                ...initialState,
                                basicInfo: {
                                    userId: parsed.userId || 'Guest',
                                    nickname: '',
                                    avatarUrl: ''
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.error("Failed to load profile from localStorage", e);
                }
            }
        },
        // Update both store and localStorage
        updateProfile: (data: ProfileData) => {
            set(data);
            if (browser) {
                localStorage.setItem("profile", JSON.stringify(data));
            }
        },
        // Helper to update specific section (optional)
        set: (data: ProfileData) => {
            set(data);
            if (browser) {
                localStorage.setItem("profile", JSON.stringify(data));
            }
        }
    };
}

export const profileStore = createProfileStore();

// Auto-initialize in browser
if (browser) {
    profileStore.init();
}
