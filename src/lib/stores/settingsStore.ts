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
    isBookmarked?: boolean;
}

export interface CollectionStep {
    id: string;
    endpointId: string;
    presetId?: string;
    name?: string;
    description?: string;
    requestMappings?: { fieldPath: string, value: string, source: 'manual' | 'variable' | 'random', text?: string, text2?: string }[];
    responseMappings?: { sourceField: string, targetVariable: string }[];
    nextStepCondition?: {
        enabled: boolean;
        field: string;
        value: string;
        operator: 'equals';
    };
    nextStepConditions?: {
        enabled: boolean;
        field: string;
        values: string[];
        operator: 'equals' | 'notEquals' | 'contains' | 'isNotEmpty' | 'validSignature';
    }[];
    conditionLogic?: 'AND' | 'OR';
}

export interface ApiCollection {
    id: string;
    application: string;
    service?: string[];
    name: string;
    description: string;
    icon?: string;
    color?: string;
    isBookmarked?: boolean;
    endpointIds?: string[]; // Legacy
    steps?: CollectionStep[];
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
        showChatbot: boolean;
        showRecentActivity: boolean;
    };
    dashboard: {
        showStats: boolean;
        showRecentActivity: boolean;
    };
    starredEndpointIds?: string[];
    bookmarks?: BookmarkSetting[];
}

export interface BookmarkSetting {
    id: string;
    name: string;
    icon: string;
    path: string;
    isEnabled: boolean;
    showNewButton: boolean;
    listLimit: number; // 0 for unlimited
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
    apiCategories?: ApiCategory[]; // Still keep for backward compatibility during load, but root is source of truth
}

export interface EndpointParameters {
    globalParameters: GlobalParameter[];
    parameterOptions: ParameterOption[];

    midContexts: MidContext[];
}

export interface SettingsStoreData {
    endpoint_parameters: EndpointParameters;
    interface: InterfaceSettings;
    apiCategories: ApiCategory[];
    apiCollections: ApiCollection[];
    applications: Application[];
}

const defaultSettings: SettingsStoreData = {
    endpoint_parameters: {
        globalParameters: [],
        parameterOptions: [],
        midContexts: [],
    },
    interface: {
        sidebar: {
            showReport: true,
            showIssue: true,
            showTestSuite: true,
            showEndpoint: true,
            showCollections: true,
            showCategories: true,
            showChatbot: true,
            showRecentActivity: true
        },
        dashboard: {
            showStats: true,
            showRecentActivity: true
        }
    },
    apiCategories: [],
    apiCollections: [],
    applications: []
};

// Default Bookmarks Initializer
const defaultBookmarks: BookmarkSetting[] = [
    { id: "api-categories", name: "Api Categories", icon: "category", path: "/categories", isEnabled: true, showNewButton: true, listLimit: 5 },
    { id: "api-collections", name: "Api Collections", icon: "folder", path: "/collections", isEnabled: true, showNewButton: true, listLimit: 5 },
    { id: "test-endpoint", name: "Test Endpoint", icon: "science", path: "/endpoint", isEnabled: true, showNewButton: true, listLimit: 5 },
];

function createSettingsStore() {
    let initialValue = defaultSettings;

    if (browser) {
        const STORE_KEY = 'settings_store';
        const CATEGORIES_KEY = 'api_categories';
        const COLLECTIONS_KEY = 'api_collections';

        const oldStored = localStorage.getItem(STORE_KEY);
        const storedCategories = localStorage.getItem(CATEGORIES_KEY);
        const storedCollections = localStorage.getItem(COLLECTIONS_KEY);

        if (oldStored || storedCategories) {
            try {
                const parsedOld = oldStored ? JSON.parse(oldStored) : {};

                // 1. 카테고리 로드 및 마이그레이션
                let finalCategories: ApiCategory[] = [];
                if (storedCategories) {
                    finalCategories = JSON.parse(storedCategories);
                } else {
                    // 기성 키(settings_store) 혹은 이전 위치들로부터 수집
                    const collectedCategories: ApiCategory[] = [];
                    if (Array.isArray(parsedOld.apiCategories)) collectedCategories.push(...parsedOld.apiCategories);

                    const sourceParams = parsedOld.endpoint_parameters || parsedOld;
                    if (sourceParams.apiCategories && Array.isArray(sourceParams.apiCategories)) {
                        collectedCategories.push(...sourceParams.apiCategories);
                    }

                    if (Array.isArray(parsedOld.applications)) {
                        parsedOld.applications.forEach((app: any) => {
                            if (Array.isArray(app.apiCategories)) collectedCategories.push(...app.apiCategories);
                        });
                    }

                    // 중복 제거 및 ID 부여
                    const categoryMap = new Map();
                    collectedCategories.forEach(cat => {
                        const id = cat.id || crypto.randomUUID();
                        if (!categoryMap.has(id)) {
                            categoryMap.set(id, { ...cat, id });
                        }
                    });
                    finalCategories = Array.from(categoryMap.values());

                    // 마이그레이션 후 독립 키에 저장
                    if (finalCategories.length > 0) {
                        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(finalCategories));
                    }
                }

                // 1.1 컬렉션 로드
                let finalCollections: ApiCollection[] = [];
                if (storedCollections) {
                    finalCollections = JSON.parse(storedCollections);
                } else {
                    const parsed = parsedOld;
                    if (Array.isArray(parsed.apiCollections)) finalCollections = parsed.apiCollections;
                }

                // 2. 나머지 설정 마이그레이션
                const sourceParams = parsedOld.endpoint_parameters || parsedOld;
                const migrateService = (item: any) => {
                    if (typeof item.service === 'string') return { ...item, service: [item.service] };
                    return item;
                };

                const oldSiteContexts = (sourceParams.siteContexts || sourceParams.serviceContexts || []).map((ctx: any) => ({
                    ...ctx,
                    id: ctx.id || crypto.randomUUID(),
                    sites: ctx.sites || []
                }));

                const migratedApplications = (parsedOld.applications || []).map((app: any) => ({
                    ...app,
                    siteContexts: [
                        ...(app.siteContexts || []),
                        ...oldSiteContexts.filter((ctx: any) => ctx.application === app.appName)
                    ]
                }));

                initialValue = {
                    ...defaultSettings,
                    endpoint_parameters: {
                        globalParameters: (sourceParams.globalParameters || []).map(migrateService),
                        parameterOptions: (sourceParams.parameterOptions || []).map(migrateService),
                        midContexts: (sourceParams.midContexts || []).map(migrateService),
                    },
                    interface: {
                        ...defaultSettings.interface,
                        ...(parsedOld.interface || {}),
                        sidebar: {
                            ...defaultSettings.interface.sidebar,
                            ...(parsedOld.interface?.sidebar || {})
                        },
                        dashboard: {
                            ...defaultSettings.interface.dashboard,
                            ...(parsedOld.interface?.dashboard || {})
                        }
                    },
                    apiCategories: finalCategories,
                    apiCollections: finalCollections,
                    applications: migratedApplications
                };

                // Ensure bookmarks exist if missing (migration)
                if (!initialValue.interface.bookmarks || initialValue.interface.bookmarks.length === 0) {
                    initialValue.interface.bookmarks = defaultBookmarks;
                } else {
                    // Check if api-collections exists, if not add it
                    const hasCollections = initialValue.interface.bookmarks.some(b => b.id === 'api-collections');
                    if (!hasCollections) {
                        const colBookmark = defaultBookmarks.find(b => b.id === 'api-collections');
                        if (colBookmark) {
                            initialValue.interface.bookmarks.push(colBookmark);
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to parse stores", e);
            }
        }
    }

    const { subscribe, set, update } = writable<SettingsStoreData>(initialValue);

    if (browser) {
        subscribe(val => {
            const { apiCategories, apiCollections, ...rest } = val;
            localStorage.setItem('settings_store', JSON.stringify(rest));
            localStorage.setItem('api_categories', JSON.stringify(apiCategories || []));
            localStorage.setItem('api_collections', JSON.stringify(apiCollections || []));
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

        // API Categories (Back to Root)
        addApiCategory: (category: Omit<ApiCategory, 'id'>) => update(s => {
            const newCategory = { ...category, id: crypto.randomUUID() };
            return {
                ...s,
                apiCategories: [...(s.apiCategories || []), newCategory]
            };
        }),
        updateApiCategory: (category: ApiCategory) => update(s => ({
            ...s,
            apiCategories: (s.apiCategories || []).map(c => c.id === category.id ? category : c)
        })),
        removeApiCategory: (id: string) => update(s => ({
            ...s,
            apiCategories: (s.apiCategories || []).filter(c => c.id !== id)
        })),

        // API Collections
        addApiCollection: (collection: Omit<ApiCollection, 'id'>) => update(s => {
            const newCollection = { ...collection, id: crypto.randomUUID() };
            return {
                ...s,
                apiCollections: [...(s.apiCollections || []), newCollection]
            };
        }),
        updateApiCollection: (collection: ApiCollection) => update(s => ({
            ...s,
            apiCollections: (s.apiCollections || []).map(c => c.id === collection.id ? collection : c)
        })),
        removeApiCollection: (id: string) => update(s => ({
            ...s,
            apiCollections: (s.apiCollections || []).filter(c => c.id !== id)
        })),
        toggleApiCollectionBookmark: (id: string) => update(s => {
            const collections = s.apiCollections || [];
            return {
                ...s,
                apiCollections: collections.map(c => c.id === id ? { ...c, isBookmarked: !c.isBookmarked } : c)
            };
        }),

        // Applications
        setApplications: (apps: Application[]) => update(s => ({
            ...s,
            applications: apps
        })),

        // Bookmarks
        updateBookmark: (id: string, updates: Partial<BookmarkSetting>) => update(s => {
            const currentBookmarks = s.interface.bookmarks || defaultBookmarks;
            const newBookmarks = currentBookmarks.map(b => b.id === id ? { ...b, ...updates } : b);
            return {
                ...s,
                interface: {
                    ...s.interface,
                    bookmarks: newBookmarks
                }
            };
        }),
        resetBookmarks: () => update(s => ({
            ...s,
            interface: {
                ...s.interface,
                bookmarks: defaultBookmarks
            }
        })),

        // Load entire settings (for restore)
        load: (data: SettingsStoreData) => set(data),

        // Bookmark Toggle Actions
        toggleApiCategoryBookmark: (id: string) => update(s => {
            const categories = s.apiCategories || [];
            const category = categories.find(c => c.id === id);
            if (!category) return s;

            // Check if disabling
            if (category.isBookmarked) {
                return {
                    ...s,
                    apiCategories: categories.map(c => c.id === id ? { ...c, isBookmarked: false } : c)
                };
            }

            // Check limit if enabling
            const bookmarkSetting = (s.interface.bookmarks || defaultBookmarks).find(b => b.id === "api-categories");
            const limit = bookmarkSetting ? bookmarkSetting.listLimit : 5;
            const currentCount = categories.filter(c => c.isBookmarked).length;

            if (currentCount >= limit) {
                alert(`Bookmark limit reached (${limit}). Please manage your limits in Settings.`);
                return s;
            }

            return {
                ...s,
                apiCategories: categories.map(c => c.id === id ? { ...c, isBookmarked: true } : c)
            };
        }),

        toggleEndpointBookmark: (id: string) => update(s => {
            const starred = s.interface.starredEndpointIds || [];
            if (starred.includes(id)) {
                return {
                    ...s,
                    interface: {
                        ...s.interface,
                        starredEndpointIds: starred.filter(sid => sid !== id)
                    }
                };
            }

            // Check limit
            const bookmarkSetting = (s.interface.bookmarks || defaultBookmarks).find(b => b.id === "test-endpoint");
            const limit = bookmarkSetting ? bookmarkSetting.listLimit : 5;

            if (starred.length >= limit) {
                alert(`Bookmark limit reached (${limit}). Please manage your limits in Settings.`);
                return s;
            }

            return {
                ...s,
                interface: {
                    ...s.interface,
                    starredEndpointIds: [...starred, id]
                }
            };
        })
    };
}

export const settingsStore = createSettingsStore();
