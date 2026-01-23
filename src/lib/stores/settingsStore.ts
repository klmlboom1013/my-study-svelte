import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface GlobalParameter {
    id: string;
    application: string;
    service?: string[];
    key: string;
    value: string;
}

export interface ParameterOption {
    id: string;
    application: string;
    service?: string[];
    name: string; // Parameter Name
    options: {
        code: string;
        value: string;
    }[];
}

export interface MidContext {
    id: string;
    application: string;
    service?: string[];
    mid: string;
    encKey: string;
    encIV: string;
    hashKey: string;
}

export interface InterfaceSettings {
    sidebar: {
        showReport: boolean;
        showIssue: boolean;
        showTestSuite: boolean;
        showEndpoint: boolean;
        showCollections: boolean;
        showCategories: boolean;
    };
    dashboard: {
        showStats: boolean;
        showRecentActivity: boolean;
    };
}

// Reuse Application interfaces matching ProfileStore structure
export interface ApplicationDomain {
    dev?: string;
    stg?: string;
    pGlb?: string;
    pKs?: string;
    pFc?: string;
}

export interface ApplicationService {
    id: string;
    name: string; // e.g. wpaystd
    domains: ApplicationDomain;
}

export interface Application {
    id: string; // Internal ID for UI rendering keys
    appName: string;
    description: string;
    useServiceDistinction?: boolean;
    domains?: ApplicationDomain;
    services?: ApplicationService[];
}

export interface EndpointParameters {
    globalParameters: GlobalParameter[];
    parameterOptions: ParameterOption[];
    midContexts: MidContext[];
}

export interface SettingsStoreData {
    endpoint_parameters: EndpointParameters;
    interface: InterfaceSettings;
    applications: Application[];
}

const defaultSettings: SettingsStoreData = {
    endpoint_parameters: {
        globalParameters: [],
        parameterOptions: [],
        midContexts: []
    },
    interface: {
        sidebar: {
            showReport: true,
            showIssue: true,
            showTestSuite: true,
            showEndpoint: true,
            showCollections: true,
            showCategories: true
        },
        dashboard: {
            showStats: true,
            showRecentActivity: true
        }
    },
    applications: []
};

const createSettingsStore = () => {
    // Initial value from localStorage or default
    // Key changed from 'endpoint_settings' to 'settings'
    const storedValue = browser ? localStorage.getItem('settings') : null;
    let initialValue: SettingsStoreData = defaultSettings;

    if (storedValue) {
        try {
            const parsed = JSON.parse(storedValue);
            // Ensure legacy data migration or partial loading if schema changed
            initialValue = {
                ...defaultSettings,
                ...parsed,
                endpoint_parameters: {
                    ...defaultSettings.endpoint_parameters,
                    ...(parsed.endpoint_parameters || {})
                },
                interface: {
                    ...defaultSettings.interface,
                    ...(parsed.interface || {})
                },
                applications: parsed.applications || []
            };
        } catch (e) {
            console.error('Failed to parse settings from localStorage', e);
        }
    } else if (browser) {
        // Migration: Check for old 'endpoint_settings'
        const oldStored = localStorage.getItem('endpoint_settings');
        if (oldStored) {
            try {
                const parsedOld = JSON.parse(oldStored);

                // Migrate Service string to array if needed (from previous logic)
                const migrateService = (item: any) => {
                    if (typeof item.service === 'string') {
                        return { ...item, service: [item.service] };
                    }
                    return item;
                };

                initialValue = {
                    ...defaultSettings,
                    endpoint_parameters: {
                        globalParameters: (parsedOld.globalParameters || []).map(migrateService),
                        parameterOptions: (parsedOld.parameterOptions || []).map(migrateService),
                        midContexts: (parsedOld.midContexts || []).map(migrateService)
                    },
                    interface: {
                        ...defaultSettings.interface,
                        ...(parsedOld.interface || {})
                    },
                    applications: []
                };

                // Attempt to grab applications from profileStore if possible? 
                // Or just start empty/fresh. 
                // Given user request "applications saved", they likely want to persist what they just edited.
                // But we don't have access to profile local storage here easily in this function synchronously without reading 'profile' key.
                const oldProfile = localStorage.getItem('profile');
                if (oldProfile) {
                    const parsedProfile = JSON.parse(oldProfile);
                    if (parsedProfile.myApplications) {
                        initialValue.applications = parsedProfile.myApplications;
                    }
                }

                // Save immediately to new key
                localStorage.setItem('settings', JSON.stringify(initialValue));
                // Optional: removeItem 'endpoint_settings' later or keep as backup
            } catch (e) {
                console.error("Failed to migrate old endpoint_settings", e);
            }
        }
    }

    const { subscribe, set, update } = writable<SettingsStoreData>(initialValue);

    const persist = (value: SettingsStoreData) => {
        if (browser) {
            localStorage.setItem('settings', JSON.stringify(value));
        }
        set(value);
    };

    return {
        subscribe,
        set: persist,
        update: (updater: (value: SettingsStoreData) => SettingsStoreData) => {
            update(current => {
                const newValue = updater(current);
                if (browser) {
                    localStorage.setItem('settings', JSON.stringify(newValue));
                }
                return newValue;
            });
        },

        // --- Helper Methods (Updated to target new structure) ---

        // Applications
        setApplications: (apps: Application[]) => {
            update(current => {
                const newValue = { ...current, applications: apps };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },

        // Global Parameters
        addGlobalParameter: (param: Omit<GlobalParameter, 'id'>) => {
            update(current => {
                const newParams = [...current.endpoint_parameters.globalParameters, { ...param, id: crypto.randomUUID() }];
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, globalParameters: newParams }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        removeGlobalParameter: (id: string) => {
            update(current => {
                const newParams = current.endpoint_parameters.globalParameters.filter(p => p.id !== id);
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, globalParameters: newParams }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        updateGlobalParameter: (param: GlobalParameter) => {
            update(current => {
                const newParams = current.endpoint_parameters.globalParameters.map(p => p.id === param.id ? param : p);
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, globalParameters: newParams }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },

        // Parameter Options
        addParameterOption: (option: Omit<ParameterOption, 'id'>) => {
            update(current => {
                const newOptions = [...current.endpoint_parameters.parameterOptions, { ...option, id: crypto.randomUUID() }];
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, parameterOptions: newOptions }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        updateParameterOption: (option: ParameterOption) => {
            update(current => {
                const newOptions = current.endpoint_parameters.parameterOptions.map(p => p.id === option.id ? option : p);
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, parameterOptions: newOptions }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        removeParameterOption: (id: string) => {
            update(current => {
                const newOptions = current.endpoint_parameters.parameterOptions.filter(p => p.id !== id);
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, parameterOptions: newOptions }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },

        // Mid Contexts
        addMidContext: (ctx: Omit<MidContext, 'id'>) => {
            update(current => {
                const newContexts = [...current.endpoint_parameters.midContexts, { ...ctx, id: crypto.randomUUID() }];
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, midContexts: newContexts }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        removeMidContext: (id: string) => {
            update(current => {
                const newContexts = current.endpoint_parameters.midContexts.filter(p => p.id !== id);
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, midContexts: newContexts }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        updateMidContext: (ctx: MidContext) => {
            update(current => {
                const newContexts = current.endpoint_parameters.midContexts.map(p => p.id === ctx.id ? ctx : p);
                const newValue = {
                    ...current,
                    endpoint_parameters: { ...current.endpoint_parameters, midContexts: newContexts }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },

        // Interface Settings
        updateInterfaceSettings: (settings: Partial<InterfaceSettings>) => {
            update(current => {
                const newValue = {
                    ...current,
                    interface: { ...current.interface, ...settings }
                };
                if (browser) localStorage.setItem('settings', JSON.stringify(newValue));
                return newValue;
            });
        },
    };
};

export const settingsStore = createSettingsStore();
