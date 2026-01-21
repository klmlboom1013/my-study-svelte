import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface GlobalParameter {
    id: string;
    application: string;
    key: string;
    value: string;
}

export interface ParameterOption {
    id: string;
    name: string; // Parameter Name
    options: {
        code: string;
        value: string;
    }[];
}

export interface MidContext {
    id: string;
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

export interface EndpointSettings {
    globalParameters: GlobalParameter[];
    parameterOptions: ParameterOption[];
    midContexts: MidContext[];
    interface: InterfaceSettings;
}

const defaultSettings: EndpointSettings = {
    globalParameters: [],
    parameterOptions: [],
    midContexts: [],
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
    }
};

const createSettingsStore = () => {
    // Initial value from localStorage or default
    const storedValue = browser ? localStorage.getItem('endpoint_settings') : null;
    let initialValue: EndpointSettings = defaultSettings;

    if (storedValue) {
        try {
            const parsed = JSON.parse(storedValue);
            initialValue = {
                ...defaultSettings,
                ...parsed,
                interface: {
                    ...defaultSettings.interface,
                    ...(parsed.interface || {})
                }
            };
        } catch (e) {
            console.error('Failed to parse settings from localStorage', e);
        }
    }

    const { subscribe, set, update } = writable<EndpointSettings>(initialValue);

    return {
        subscribe,
        set: (value: EndpointSettings) => {
            if (browser) {
                localStorage.setItem('endpoint_settings', JSON.stringify(value));
            }
            set(value);
        },
        update: (updater: (value: EndpointSettings) => EndpointSettings) => {
            update(current => {
                const newValue = updater(current);
                if (browser) {
                    localStorage.setItem('endpoint_settings', JSON.stringify(newValue));
                }
                return newValue;
            });
        },
        // Helper to add Global Parameter
        addGlobalParameter: (param: Omit<GlobalParameter, 'id'>) => {
            update(current => {
                const newValue = {
                    ...current,
                    globalParameters: [...current.globalParameters, { ...param, id: crypto.randomUUID() }]
                };
                if (browser) localStorage.setItem('endpoint_settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        // Helper to remove Global Parameter
        removeGlobalParameter: (id: string) => {
            update(current => {
                const newValue = {
                    ...current,
                    globalParameters: current.globalParameters.filter(p => p.id !== id)
                };
                if (browser) localStorage.setItem('endpoint_settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        // Helper to add Parameter Option
        addParameterOption: (option: Omit<ParameterOption, 'id'>) => {
            update(current => {
                const newValue = {
                    ...current,
                    parameterOptions: [...current.parameterOptions, { ...option, id: crypto.randomUUID() }]
                };
                if (browser) localStorage.setItem('endpoint_settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        // Helper to remove Parameter Option
        removeParameterOption: (id: string) => {
            update(current => {
                const newValue = {
                    ...current,
                    parameterOptions: current.parameterOptions.filter(p => p.id !== id)
                };
                if (browser) localStorage.setItem('endpoint_settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        // Helper to add Mid Context
        addMidContext: (ctx: Omit<MidContext, 'id'>) => {
            update(current => {
                const newValue = {
                    ...current,
                    midContexts: [...current.midContexts, { ...ctx, id: crypto.randomUUID() }]
                };
                if (browser) localStorage.setItem('endpoint_settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        // Helper to remove Mid Context
        removeMidContext: (id: string) => {
            update(current => {
                const newValue = {
                    ...current,
                    midContexts: current.midContexts.filter(p => p.id !== id)
                };
                if (browser) localStorage.setItem('endpoint_settings', JSON.stringify(newValue));
                return newValue;
            });
        },
        // Helper to update Interface Settings
        updateInterfaceSettings: (settings: Partial<InterfaceSettings>) => {
            update(current => {
                const newValue = {
                    ...current,
                    interface: { ...current.interface, ...settings }
                };
                if (browser) localStorage.setItem('endpoint_settings', JSON.stringify(newValue));
                return newValue;
            });
        },
    };
};

export const settingsStore = createSettingsStore();
