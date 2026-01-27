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

export interface ApiCategory {
    id: string;
    application: string;
    service?: string[]; // Optional, strict for 'WPAY'
    name: string;
    description: string;
    icon?: string; // Material Symbol name
    color?: string; // Hex color code
}


export interface SiteContext {
    id: string;
    application: string; // "WPAY"
    service: string;
    sites: string[];
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
    siteContexts?: SiteContext[]; // Moved here
    apiCategories?: ApiCategory[]; // Moved here
}

export interface EndpointParameters {
    globalParameters: GlobalParameter[];
    parameterOptions: ParameterOption[];

    midContexts: MidContext[];
    // siteContexts: SiteContext[]; // Removed
    // apiCategories: ApiCategory[]; // Removed
}

export interface SettingsStoreData {
    endpoint_parameters: EndpointParameters;
    interface: InterfaceSettings;
    // apiCategories: ApiCategory[]; // Removed from root
    applications: Application[];
}

const defaultSettings: SettingsStoreData = {
    endpoint_parameters: {
        globalParameters: [],
        parameterOptions: [],

        midContexts: [],
        // siteContexts: [], // Removed
        // apiCategories: [] // Removed from endpoint_parameters
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
    // apiCategories: [], // Removed from root
    applications: []
};

function createSettingsStore() {
    let initialValue = defaultSettings;

    if (browser) {
        const STORE_KEY = 'settings_store';
        const oldStored = localStorage.getItem('settings_store');
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

                // Check if old structure (flat) or new structure (nested in endpoint_parameters)
                const sourceParams = parsedOld.endpoint_parameters || parsedOld;

                // Get old siteContexts to migrate
                const oldSiteContexts = (sourceParams.siteContexts || sourceParams.serviceContexts || []).map((ctx: any) => ({
                    ...ctx,
                    id: ctx.id || crypto.randomUUID(),
                    sites: ctx.sites || []
                }));

                // Get old apiCategories to migrate
                const oldCategories = (parsedOld.apiCategories || sourceParams.apiCategories || []).map((cat: any) => ({
                    ...cat,
                    id: cat.id || crypto.randomUUID()
                }));

                const migratedApplications = (parsedOld.applications || []).map((app: any) => ({
                    ...app,
                    // Migrate siteContexts into app if they match appName
                    siteContexts: [
                        ...(app.siteContexts || []),
                        ...oldSiteContexts.filter((ctx: any) => ctx.application === app.appName)
                    ],
                    // Migrate apiCategories into app if they match appName
                    apiCategories: [
                        ...(app.apiCategories || []),
                        ...oldCategories.filter((cat: any) => cat.application === app.appName)
                    ]
                }));

                initialValue = {
                    ...defaultSettings,
                    endpoint_parameters: {
                        globalParameters: (sourceParams.globalParameters || []).map(migrateService),
                        parameterOptions: (sourceParams.parameterOptions || []).map(migrateService),

                        midContexts: (sourceParams.midContexts || []).map(migrateService),
                        // siteContexts removed from here
                        // apiCategories removed from here
                    },
                    interface: {
                        ...defaultSettings.interface,
                        ...(parsedOld.interface || {})
                    },
                    // apiCategories moved to applications
                    applications: migratedApplications
                };

                // Remove legacy keys if exist in structure during runtime usage
            } catch (e) {
                console.error("Failed to parse settings store", e);
            }
        }
    }

    const { subscribe, set, update } = writable<SettingsStoreData>(initialValue);

    if (browser) {
        subscribe(val => {
            localStorage.setItem('settings_store', JSON.stringify(val));
        });
    }

    return {
        subscribe,
        set,
        update,
        // Global Parameters
        addGlobalParameter: (param: Omit<GlobalParameter, 'id'>) => update(s => {
            const newParam = { ...param, id: crypto.randomUUID() };
            return {
                ...s,
                endpoint_parameters: {
                    ...s.endpoint_parameters,
                    globalParameters: [...s.endpoint_parameters.globalParameters, newParam]
                }
            };
        }),
        updateGlobalParameter: (param: GlobalParameter) => update(s => ({
            ...s,
            endpoint_parameters: {
                ...s.endpoint_parameters,
                globalParameters: s.endpoint_parameters.globalParameters.map(p => p.id === param.id ? param : p)
            }
        })),
        removeGlobalParameter: (id: string) => update(s => ({
            ...s,
            endpoint_parameters: {
                ...s.endpoint_parameters,
                globalParameters: s.endpoint_parameters.globalParameters.filter(p => p.id !== id)
            }
        })),

        // Parameter Options
        addParameterOption: (opt: Omit<ParameterOption, 'id'>) => update(s => {
            const newOption = { ...opt, id: crypto.randomUUID() };
            return {
                ...s,
                endpoint_parameters: {
                    ...s.endpoint_parameters,
                    parameterOptions: [...s.endpoint_parameters.parameterOptions, newOption]
                }
            };
        }),
        updateParameterOption: (opt: Partial<ParameterOption> & { id: string }) => update(s => ({
            ...s,
            endpoint_parameters: {
                ...s.endpoint_parameters,
                parameterOptions: s.endpoint_parameters.parameterOptions.map(p => p.id === opt.id ? { ...p, ...opt } as ParameterOption : p)
            }
        })),
        removeParameterOption: (id: string) => update(s => ({
            ...s,
            endpoint_parameters: {
                ...s.endpoint_parameters,
                parameterOptions: s.endpoint_parameters.parameterOptions.filter(p => p.id !== id)
            }
        })),

        // MID Contexts
        addMidContext: (ctx: Omit<MidContext, 'id'>) => update(s => {
            const newContext = { ...ctx, id: crypto.randomUUID() };
            return {
                ...s,
                endpoint_parameters: {
                    ...s.endpoint_parameters,
                    midContexts: [...s.endpoint_parameters.midContexts, newContext]
                }
            };
        }),
        updateMidContext: (ctx: MidContext) => update(s => ({
            ...s,
            endpoint_parameters: {
                ...s.endpoint_parameters,
                midContexts: s.endpoint_parameters.midContexts.map(c => c.id === ctx.id ? ctx : c)
            }
        })),
        removeMidContext: (id: string) => update(s => ({
            ...s,
            endpoint_parameters: {
                ...s.endpoint_parameters,
                midContexts: s.endpoint_parameters.midContexts.filter(c => c.id !== id)
            }
        })),

        // Site Contexts
        // Site Contexts methods now operate on Applications
        addSiteContext: (ctx: Omit<SiteContext, 'id'>) => update(s => {
            const newContext = { ...ctx, id: crypto.randomUUID() };
            return {
                ...s,
                applications: (s.applications || []).map(app => {
                    if (app.appName === ctx.application) {
                        return {
                            ...app,
                            siteContexts: [...(app.siteContexts || []), newContext]
                        };
                    }
                    return app;
                })
            };
        }),
        removeSiteContext: (id: string) => update(s => ({
            ...s,
            applications: (s.applications || []).map(app => ({
                ...app,
                siteContexts: (app.siteContexts || []).filter(c => c.id !== id)
            }))
        })),
        addSiteToContext: (contextId: string, siteName: string) => update(s => ({
            ...s,
            applications: (s.applications || []).map(app => ({
                ...app,
                siteContexts: (app.siteContexts || []).map(c =>
                    c.id === contextId
                        ? { ...c, sites: [...c.sites, siteName] }
                        : c
                )
            }))
        })),
        removeSiteFromContext: (contextId: string, siteName: string) => update(s => ({
            ...s,
            applications: (s.applications || []).map(app => ({
                ...app,
                siteContexts: (app.siteContexts || []).map(c =>
                    c.id === contextId
                        ? { ...c, sites: c.sites.filter(site => site !== siteName) }
                        : c
                )
            }))
        })),

        // API Categories
        // API Categories
        addApiCategory: (category: Omit<ApiCategory, 'id'>) => update(s => {
            const newCategory = { ...category, id: crypto.randomUUID() };
            return {
                ...s,
                applications: (s.applications || []).map(app => {
                    if (app.appName === category.application) {
                        return {
                            ...app,
                            apiCategories: [...(app.apiCategories || []), newCategory]
                        };
                    }
                    return app;
                })
            };
        }),
        updateApiCategory: (category: ApiCategory) => update(s => ({
            ...s,
            applications: (s.applications || []).map(app => {
                if (app.appName === category.application) {
                    return {
                        ...app,
                        apiCategories: (app.apiCategories || []).map(c => c.id === category.id ? category : c)
                    };
                }
                return app;
            })
        })),
        removeApiCategory: (id: string) => update(s => ({
            ...s,
            applications: (s.applications || []).map(app => ({
                ...app,
                apiCategories: (app.apiCategories || []).filter(c => c.id !== id)
            }))
        })),


        // Applications
        setApplications: (apps: Application[]) => update(s => ({
            ...s,
            applications: apps
        })),

        // Load entire settings (for restore)
        load: (data: SettingsStoreData) => set(data)
    };
}

export const settingsStore = createSettingsStore();
