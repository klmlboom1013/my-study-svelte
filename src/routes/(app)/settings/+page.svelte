<script lang="ts">
    import { page } from "$app/stores";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { profileStore } from "$lib/stores/profileStore";
    import {
        authStore,
        loginWithGoogle,
    } from "$lib/features/auth/services/authService";
    import { driveService } from "$lib/features/drive/services/driveService";
    import {
        settingsStore,
        type GlobalParameter,
        type ParameterOption,
        type MidContext,
        type SiteContext,
    } from "$lib/stores/settingsStore";
    // Fixed WPAY service options
    const SERVICE_OPTIONS = ["wpaystd2"];
    import { onMount, tick } from "svelte";
    import { get } from "svelte/store";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import MultiSelectBox from "$lib/components/ui/MultiSelectBox.svelte";

    let activeCategory = $state("endpoint"); // 'endpoint', 'interface', 'application'
    let activeSubTab = $state("global"); // for endpoint: 'global', 'options', 'mid'
    let activeAppSubTab = $state("settings"); // for application: 'settings', 'site'

    // Form states
    let globalParam = $state({
        application: "",
        service: "",
        key: "",
        value: "",
    });

    // List Filter State
    let listFilterService = $state("");
    let listFilterServiceOptions = $state("");

    let selectedService = $state<string[]>([]); // For Global Params ADD form
    let selectedOptionService = $state<string[]>([]); // For Param Options ADD form
    let paramOption = $state({
        application: "",
        service: [] as string[],
        name: "",
        code: "",
        value: "",
    });
    let midContext = $state({
        application: "",
        service: [] as string[],
        mid: "",
        encKey: "",
        encIV: "",
        hashKey: "",
    });
    let selectedMidService = $state<string[]>([]);
    let listFilterMidServiceOptions = $state("");

    // --- Site Context State ---
    let siteContext = $state<{
        application: string;
        service: string;
    }>({
        application: "WPAY",
        service: "",
    });

    let newSiteName = $state("");
    let addingSiteToContextId = $state<string | null>(null);
    let editingContextId = $state<string | null>(null);

    // Temporary state for adding options to a new parameter option set
    let currentOptions = $state<{ code: string; value: string }[]>([]);
    let editingOptionIndex = $state<number | null>(null); // Track index of option being edited
    let editingId = $state<string | null>(null);
    let editingMidId = $state<string | null>(null);
    let editingGlobalParamId = $state<string | null>(null);

    // Alert Modal state
    let alertModalState = $state({
        isOpen: false,
        title: "",
        message: "",
        type: "alert" as "alert" | "confirm",
        onConfirm: undefined as (() => void) | undefined,
    });

    // Loading States
    let isBackupLoading = $state(false);
    let isRestoreLoading = $state(false);

    function showAlert(
        title: string,
        message: string,
        type: "alert" | "confirm" = "alert",
        onConfirm?: () => void,
    ) {
        alertModalState.title = title;
        alertModalState.message = message;
        alertModalState.type = type;
        alertModalState.onConfirm = onConfirm;
        alertModalState.isOpen = true;
    }

    async function handleConnectGoogle() {
        try {
            await loginWithGoogle();
            showAlert(
                "Connection Successful",
                "Google Account connected. Please try again.",
            );
        } catch (e) {
            console.error(e);
            showAlert(
                "Connection Failed",
                "Failed to connect to Google Account.",
            );
        }
    }

    // Computed: Filtered Global Parameters
    // Filter by Header Application Selection (via Shared Store) AND Service Filter (if WPAY)
    let filteredGlobalParams = $derived.by(() => {
        const headerApp = $appStateStore.selectedApp;
        const isAll = !headerApp || headerApp === "All";

        return $settingsStore.endpoint_parameters.globalParameters.filter(
            (param) => {
                if (!isAll && param.application !== headerApp) return false;
                // Strict match for service filter if WPAY
                if (
                    headerApp === "WPAY" &&
                    listFilterService &&
                    listFilterService !== "All"
                ) {
                    // Check if the parameter applies to the filtered service
                    // If param.service is undefined (All) or includes the service
                    return (
                        !param.service ||
                        param.service.length === 0 ||
                        param.service.includes(listFilterService)
                    );
                }
                return true;
            },
        );
    });

    let filteredParameterOptions = $derived.by(() => {
        const headerApp = $appStateStore.selectedApp;
        const isAll = !headerApp || headerApp === "All";

        return $settingsStore.endpoint_parameters.parameterOptions.filter(
            (opt) => {
                // 1. Primary Filter: Application
                if (!isAll && opt.application !== headerApp) {
                    return false;
                }

                // 2. Secondary Filter: Service (Only if App is WPAY)
                if (
                    headerApp === "WPAY" &&
                    listFilterServiceOptions &&
                    listFilterServiceOptions !== "All"
                ) {
                    return (
                        !opt.service ||
                        opt.service.length === 0 ||
                        opt.service.includes(listFilterServiceOptions)
                    );
                }

                return true;
            },
        );
    });

    let filteredMidContexts = $derived.by(() => {
        const headerApp = $appStateStore.selectedApp;
        const isAll = !headerApp || headerApp === "All";

        return $settingsStore.endpoint_parameters.midContexts.filter((ctx) => {
            // 1. Primary Filter: Application
            if (!isAll && ctx.application !== headerApp) {
                return false;
            }

            // 2. Secondary Filter: Service (Only if App is WPAY)
            if (
                headerApp === "WPAY" &&
                listFilterMidServiceOptions &&
                listFilterMidServiceOptions !== "All"
            ) {
                return (
                    !ctx.service ||
                    ctx.service.length === 0 ||
                    ctx.service.includes(listFilterMidServiceOptions)
                );
            }

            return true;
        });
    });

    function addGlobalParam() {
        if (!globalParam.application || !globalParam.key || !globalParam.value)
            return;

        if (globalParam.application === "WPAY" && selectedService.length === 0)
            return;

        const newParam = {
            ...globalParam,
            service: selectedService,
        };

        if (editingGlobalParamId) {
            settingsStore.updateGlobalParameter({
                ...newParam,
                id: editingGlobalParamId,
            });
            showAlert("Success", "Global Parameter updated successfully.");
            cancelGlobalEdit();
        } else {
            settingsStore.addGlobalParameter(newParam);

            // Reset KEY and VALUE only, keep App/Service for continuous entry
            globalParam.key = "";
            globalParam.value = "";
        }
    }

    function editGlobalParameter(param: any) {
        editingGlobalParamId = param.id;
        globalParam = {
            application: param.application,
            service: param.service || [],
            key: param.key,
            value: param.value,
        };
        // If service is undefined (All), select all options or none?
        // Migration handles old single strings.
        // If undefined, it means "All", so let's select all options for better visibility?
        // Or just map what's there.
        selectedService = param.service ? [...param.service] : [];

        // If it was undefined and app is WPAY, select all?
        if (
            param.application === "WPAY" &&
            (!param.service || param.service.length === 0)
        ) {
            selectedService = [...SERVICE_OPTIONS];
        }
    }

    function cancelGlobalEdit() {
        editingGlobalParamId = null;
        globalParam = {
            application: "",
            service: "",
            key: "",
            value: "",
        };
        selectedService = [];
    }

    async function backupSettings() {
        const token = $authStore.accessToken;
        if (!token) {
            showAlert(
                "Connection Required",
                "Google Account connection is required for backup.\nDo you want to connect now?",
                "confirm",
                handleConnectGoogle,
            );
            return;
        }

        isBackupLoading = true;
        try {
            await driveService.saveSettings(token, $settingsStore);
            showAlert(
                "Success",
                "Settings backed up to Google Drive successfully.",
            );
        } catch (e: any) {
            console.error("Backup Error:", e);
            if (e.message && e.message.includes("401")) {
                showAlert(
                    "Token Expired",
                    "Google Drive access token is expired.\nDo you want to reconnect?",
                    "confirm",
                    handleConnectGoogle,
                );
            } else {
                showAlert(
                    "Backup Failed",
                    `Failed to backup settings.\nReason: ${e.message || "Unknown error"}`,
                );
            }
        } finally {
            isBackupLoading = false;
        }
    }

    async function restoreSettings() {
        const token = $authStore.accessToken;
        if (!token) {
            showAlert(
                "Connection Required",
                "Google Account connection is required for restore.\nDo you want to connect now?",
                "confirm",
                handleConnectGoogle,
            );
            return;
        }

        isRestoreLoading = true;
        try {
            const data = await driveService.loadSettings(token);
            if (data) {
                settingsStore.set(data);
                showAlert("Success", "Settings restored from Google Drive.");
            } else {
                showAlert("Info", "No settings found in Drive.");
            }
        } catch (e: any) {
            console.error("Restore Error:", e);
            if (e.message && e.message.includes("401")) {
                showAlert(
                    "Token Expired",
                    "Google Drive access token is expired.\nDo you want to reconnect?",
                    "confirm",
                    handleConnectGoogle,
                );
            } else {
                showAlert(
                    "Restore Failed",
                    `Failed to restore settings.\nReason: ${e.message || "Unknown error"}`,
                );
            }
        } finally {
            isRestoreLoading = false;
        }
    }

    function addOptionToCurrent() {
        if (paramOption.code && paramOption.value) {
            if (editingOptionIndex !== null) {
                // Update existing option
                currentOptions = currentOptions.map((opt, idx) =>
                    idx === editingOptionIndex
                        ? { code: paramOption.code, value: paramOption.value }
                        : opt,
                );
                editingOptionIndex = null;
            } else {
                // Add new option
                currentOptions = [
                    ...currentOptions,
                    { code: paramOption.code, value: paramOption.value },
                ];
            }
            paramOption.code = "";
            paramOption.value = "";
        }
    }

    function editOptionValue(index: number) {
        const opt = currentOptions[index];
        paramOption.code = opt.code;
        paramOption.value = opt.value;
        editingOptionIndex = index;
    }

    function cancelOptionValueEdit() {
        paramOption.code = "";
        paramOption.value = "";
        editingOptionIndex = null;
    }

    function saveParameterOption() {
        if (
            !paramOption.application ||
            !paramOption.name ||
            currentOptions.length === 0
        )
            return;

        // Validate Service if App is WPAY
        if (
            paramOption.application === "WPAY" &&
            selectedOptionService.length === 0
        )
            return;

        const newOption = {
            ...paramOption,
            service: selectedOptionService,
        };

        if (editingId) {
            settingsStore.updateParameterOption({
                id: editingId,
                application: newOption.application,
                service: newOption.service,
                name: newOption.name,
                options: currentOptions,
            });
            showAlert("Success", "Parameter Option updated successfully.");
        } else {
            settingsStore.addParameterOption({
                application: newOption.application,
                service: newOption.service,
                name: newOption.name,
                options: currentOptions,
            });
        }

        cancelEdit();
    }

    function editParameterOption(opt: any) {
        editingId = opt.id;
        paramOption = {
            application: opt.application,
            service: opt.service || [],
            name: opt.name,
            code: "",
            value: "",
        };
        selectedOptionService = opt.service ? [...opt.service] : [];
        currentOptions = [...opt.options];

        // Ensure service dropdown is shown if editing WPAY app
        if (
            opt.application === "WPAY" &&
            (!opt.service || opt.service.length === 0)
        ) {
            selectedOptionService = [...SERVICE_OPTIONS];
        }
    }

    function cancelEdit() {
        editingId = null;
        paramOption = {
            application: "",
            service: [],
            name: "",
            code: "",
            value: "",
        };
        selectedOptionService = [];
        currentOptions = [];
        editingOptionIndex = null;
    }

    function addMidContext() {
        if (!midContext.mid || !midContext.application) return;

        // Validate Service if App is WPAY
        if (
            midContext.application === "WPAY" &&
            selectedMidService.length === 0
        )
            return;

        const newContext = {
            ...midContext,
            service: selectedMidService,
        };

        if (editingMidId) {
            settingsStore.updateMidContext({
                ...newContext,
                id: editingMidId,
            });
            showAlert("Success", "MID Context updated successfully.");
        } else {
            settingsStore.addMidContext(newContext);
            showAlert("Success", "MID Context added successfully.");
        }

        cancelMidEdit();
    }

    function editMidContext(ctx: any) {
        editingMidId = ctx.id;
        midContext = {
            application: ctx.application,
            service: ctx.service,
            mid: ctx.mid,
            encKey: ctx.encKey,
            encIV: ctx.encIV,
            hashKey: ctx.hashKey,
        };
        selectedMidService = ctx.service ? [...ctx.service] : [];

        // Ensure service dropdown is shown/set if editing WPAY app
        if (
            ctx.application === "WPAY" &&
            (!ctx.service || ctx.service.length === 0)
        ) {
            selectedMidService = [...SERVICE_OPTIONS];
        }
    }

    function cancelMidEdit() {
        editingMidId = null;
        midContext = {
            application: "",
            service: [],
            mid: "",
            encKey: "",
            encIV: "",
            hashKey: "",
        };
        selectedMidService = [];
    }

    // Application Management State
    let editingAppId = $state<string | null>(null);
    let appForm = $state({
        appName: "",
        description: "",
        useServiceDistinction: false,
        domains: {
            dev: "",
            stg: "",
            pGlb: "",
            pKs: "",
            pFc: "",
        },
        services: [] as {
            id: string;
            name: string;
            domains: {
                dev: string;
                stg: string;
                pGlb: string;
                pKs: string;
                pFc: string;
            };
        }[],
    });

    // Helper for Service Management within App Form
    function addAppService() {
        appForm.services = [
            ...appForm.services,
            {
                id: crypto.randomUUID(),
                name: "",
                domains: {
                    dev: "",
                    stg: "",
                    pGlb: "",
                    pKs: "",
                    pFc: "",
                },
            },
        ];
    }

    function removeAppService(id: string) {
        appForm.services = appForm.services.filter((s) => s.id !== id);
    }

    function editApplication(app: any) {
        editingAppId = app.id;
        appForm = {
            appName: app.appName,
            description: app.description,
            useServiceDistinction: app.useServiceDistinction || false,
            domains: {
                dev: app.domains?.dev || "",
                stg: app.domains?.stg || "",
                pGlb: app.domains?.pGlb || "",
                pKs: app.domains?.pKs || "",
                pFc: app.domains?.pFc || "",
            },
            services: app.services
                ? app.services.map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      domains: {
                          dev: s.domains?.dev || "",
                          stg: s.domains?.stg || "",
                          pGlb: s.domains?.pGlb || "",
                          pKs: s.domains?.pKs || "",
                          pFc: s.domains?.pFc || "",
                      },
                  }))
                : [],
        };
    }

    function cancelAppEdit() {
        editingAppId = null;
        appForm = {
            appName: "",
            description: "",
            useServiceDistinction: false,
            domains: {
                dev: "",
                stg: "",
                pGlb: "",
                pKs: "",
                pFc: "",
            },
            services: [],
        };
    }

    async function saveApplication() {
        if (!appForm.appName) {
            showAlert("Error", "Application Name is required.");
            return;
        }

        // Validate Services if Service Distinction is ON
        if (appForm.useServiceDistinction) {
            if (appForm.services.length === 0) {
                showAlert(
                    "Error",
                    "At least one service is required when Service Distinction is enabled.",
                );
                return;
            }
            if (appForm.services.some((s) => !s.name)) {
                showAlert("Error", "All services must have a name.");
                return;
            }
        }

        const currentApps = $settingsStore.applications || [];
        let newApplications = [...currentApps];

        if (editingAppId) {
            // Update
            newApplications = newApplications.map((app) =>
                app.id === editingAppId
                    ? {
                          ...app,
                          appName: appForm.appName,
                          description: appForm.description,
                          useServiceDistinction: appForm.useServiceDistinction,
                          domains: appForm.domains,
                          services: appForm.services,
                      }
                    : app,
            );
        } else {
            // Add
            newApplications.push({
                id: crypto.randomUUID(),
                appName: appForm.appName,
                description: appForm.description,
                useServiceDistinction: appForm.useServiceDistinction,
                domains: appForm.domains,
                services: appForm.services,
            });
        }

        // Persist via SettingsStore
        try {
            settingsStore.setApplications(newApplications);

            showAlert(
                "Success",
                editingAppId
                    ? "Application updated successfully."
                    : "Application added successfully.",
            );
            cancelAppEdit();
        } catch (e) {
            console.error("Failed to save application", e);
            showAlert("Error", "Failed to save application data.");
        }
    }

    function deleteApplication(id: string) {
        showAlert(
            "Confirm Delete",
            "Are you sure you want to delete this application?",
            "confirm",
            () => {
                const currentApps = $settingsStore.applications || [];
                const newApplications = currentApps.filter(
                    (app) => app.id !== id,
                );

                settingsStore.setApplications(newApplications);

                if (editingAppId === id) cancelAppEdit();
            },
        );
    }

    function updateInterface(
        section: "sidebar" | "dashboard",
        key: string,
        value: boolean,
    ) {
        settingsStore.update((current) => {
            const newInterface = { ...current.interface };
            // @ts-ignore - dynamic key access
            newInterface[section] = { ...newInterface[section], [key]: value };
            return { ...current, interface: newInterface };
        });
    }

    const categories = [
        { id: "endpoint", label: "Endpoint Parameters", icon: "tune" },
        { id: "interface", label: "Interface", icon: "web_asset" },
        { id: "application", label: "Applications", icon: "apps" },
    ];

    const APP_OPTIONS = [
        { name: "WPAY", description: "Simple Payment Service" },
        { name: "Express", description: "Create Payment Button" },
        { name: "Smart", description: "SMS Payment Link" },
        { name: "sbuckwpay", description: "Starbucks Simple Payment" },
    ];
    function addSiteContext() {
        if (!siteContext.service) return;

        settingsStore.addSiteContext({
            application: "WPAY",
            service: siteContext.service,
            sites: [],
        });

        // Reset
        siteContext.service = "";
    }

    function removeSiteContext(id: string) {
        showAlert(
            "Delete Site Context",
            "Are you sure you want to delete this site context?",
            "confirm",
            () => {
                settingsStore.removeSiteContext(id);
            },
        );
    }

    function addSite(contextId: string) {
        if (!newSiteName) return;
        settingsStore.addSiteToContext(contextId, newSiteName);
        newSiteName = "";
        addingSiteToContextId = null;
    }

    function removeSite(contextId: string, site: string) {
        showAlert("Remove Site", `Remove site '${site}'?`, "confirm", () => {
            settingsStore.removeSiteFromContext(contextId, site);
        });
    }

    let filteredSiteContexts = $derived.by(() => {
        const contexts = $settingsStore.endpoint_parameters.siteContexts || [];
        // Currently Application is fixed to WPAY for this feature
        return contexts;
    });

    // Derived: Services available for selection in Site Context (Filtered by WPAY)
    let availableServicesForSiteContext = $derived.by(() => {
        const wpayApp = $settingsStore.applications?.find(
            (app) => app.appName === "WPAY",
        );
        if (!wpayApp || !wpayApp.services) return [];
        return wpayApp.services.map((s) => s.name);
    });

    function getServicesForApp(appName: string) {
        if (!appName) return [];

        const customApp = $settingsStore.applications?.find(
            (a) => a.appName === appName,
        );
        if (customApp && customApp.services && customApp.services.length > 0) {
            return customApp.services.map((s) => s.name);
        }

        // Fallback for WPAY
        if (appName === "WPAY") {
            return [...SERVICE_OPTIONS];
        }

        return [];
    }
</script>

<div class="max-w-screen-2xl mx-auto py-8 px-4">
    <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Settings" }]}
    />

    <div class="flex items-end justify-between mb-8">
        <div>
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Settings
            </h1>
            <p class="text-slate-500 dark:text-slate-400">
                Manage global configurations for endpoints and user interface.
            </p>
        </div>
        <div class="flex gap-2">
            <button
                class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                onclick={backupSettings}
                disabled={isBackupLoading || isRestoreLoading}
            >
                {#if isBackupLoading}
                    <span
                        class="material-symbols-outlined text-[18px] animate-spin"
                        >sync</span
                    >
                    Wait...
                {:else}
                    <span class="material-symbols-outlined text-[18px]"
                        >cloud_upload</span
                    >
                    Backup
                {/if}
            </button>
            <button
                class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                onclick={restoreSettings}
                disabled={isBackupLoading || isRestoreLoading}
            >
                {#if isRestoreLoading}
                    <span
                        class="material-symbols-outlined text-[18px] animate-spin"
                        >sync</span
                    >
                    Wait...
                {:else}
                    <span class="material-symbols-outlined text-[18px]"
                        >cloud_download</span
                    >
                    Restore
                {/if}
            </button>
        </div>
    </div>

    <div class="flex flex-col md:flex-row gap-8">
        <!-- Sidebar Navigation -->
        <aside class="w-full md:w-64 flex-shrink-0">
            <div
                class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden"
            >
                <div
                    class="p-4 bg-slate-50 dark:bg-background-dark border-b border-slate-200 dark:border-border-dark"
                >
                    <h2
                        class="font-semibold text-slate-700 dark:text-slate-200"
                    >
                        Categories
                    </h2>
                </div>
                <nav class="flex flex-col p-2 space-y-1">
                    {#each categories as category}
                        <button
                            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {activeCategory ===
                            category.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-primary'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}"
                            onclick={() => (activeCategory = category.id)}
                        >
                            <span class="material-symbols-outlined text-[20px]"
                                >{category.icon}</span
                            >
                            {category.label}
                        </button>
                    {/each}
                </nav>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main
            class="flex-1 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark min-h-[500px] shadow-sm flex flex-col"
        >
            <!-- Endpoint Configuration Header / Tabs -->
            {#if activeCategory === "endpoint"}
                <div class="border-b border-slate-200 dark:border-border-dark">
                    <div class="flex overflow-x-auto">
                        <button
                            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeSubTab ===
                            'global'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                            onclick={() => (activeSubTab = "global")}
                        >
                            Global Parameters
                        </button>
                        <button
                            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeSubTab ===
                            'options'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                            onclick={() => (activeSubTab = "options")}
                        >
                            Parameter Options
                        </button>
                        <button
                            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeSubTab ===
                            'mid'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                            onclick={() => (activeSubTab = "mid")}
                        >
                            MID Context
                        </button>
                    </div>
                </div>

                <!-- Endpoint Content -->
                <div class="p-6">
                    {#if activeSubTab === "global"}
                        <!-- Global Parameters Content -->
                        <div
                            class="mb-8 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark"
                        >
                            <h3
                                class="text-base font-bold text-slate-800 dark:text-white mb-4"
                            >
                                Add Global Parameter
                            </h3>
                            <div class="flex flex-col gap-4">
                                <div
                                    class="flex flex-col md:flex-row gap-4 items-end"
                                >
                                    <label
                                        class="flex flex-col gap-1 w-full md:w-1/3"
                                    >
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Application</span
                                        >
                                        <div class="flex gap-2">
                                            <select
                                                class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
                                                bind:value={
                                                    globalParam.application
                                                }
                                                onchange={() =>
                                                    (selectedService = [])}
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    selected
                                                    >Select Application</option
                                                >
                                                {#each $profileStore.myApplications as app}
                                                    <option value={app.appName}
                                                        >{app.appName}</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>
                                    </label>
                                    {#if getServicesForApp(globalParam.application).length > 0}
                                        <div class="w-full md:w-1/3">
                                            <MultiSelectBox
                                                bind:value={selectedService}
                                                options={getServicesForApp(
                                                    globalParam.application,
                                                )}
                                                placeholder="Select Service"
                                            />
                                        </div>
                                    {/if}
                                </div>
                                <div
                                    class="flex flex-col md:flex-row gap-4 items-end"
                                >
                                    <label class="flex flex-col gap-1 flex-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Key</span
                                        >
                                        <input
                                            type="text"
                                            placeholder="Parameter Key"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                            bind:value={globalParam.key}
                                        />
                                    </label>
                                    <label class="flex flex-col gap-1 flex-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Value</span
                                        >
                                        <input
                                            type="text"
                                            placeholder="Parameter Value"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                            bind:value={globalParam.value}
                                        />
                                    </label>
                                    <div
                                        class="flex items-end w-full md:w-auto gap-2"
                                    >
                                        {#if editingGlobalParamId}
                                            <button
                                                class="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-full md:w-auto whitespace-nowrap"
                                                onclick={cancelGlobalEdit}
                                                >Cancel</button
                                            >
                                        {/if}
                                        <button
                                            class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto whitespace-nowrap"
                                            disabled={!globalParam.application ||
                                                !globalParam.key ||
                                                !globalParam.value ||
                                                (globalParam.application ===
                                                    "WPAY" &&
                                                    selectedService.length ===
                                                        0)}
                                            onclick={addGlobalParam}
                                        >
                                            {editingGlobalParamId
                                                ? "Update"
                                                : "Add"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Parameters List -->
                        <div
                            class="bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden"
                        >
                            <!-- List Filter Toolbar (Visible only if WPAY is selected in Header) -->
                            <!-- List Filter Toolbar (Visible if App has Services) -->
                            {#if getServicesForApp($appStateStore.selectedApp).length > 0}
                                <div
                                    class="px-6 py-3 border-b border-slate-200 dark:border-border-dark flex justify-end"
                                >
                                    <div class="w-48">
                                        <select
                                            class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white"
                                            bind:value={listFilterService}
                                        >
                                            <option value=""
                                                >All Services</option
                                            >
                                            {#each getServicesForApp($appStateStore.selectedApp) as service}
                                                <option value={service}
                                                    >{service}</option
                                                >
                                            {/each}
                                        </select>
                                    </div>
                                </div>
                            {/if}

                            <div class="overflow-x-auto">
                                <table class="w-full text-sm text-left">
                                    <thead
                                        class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-background-dark border-b border-slate-200 dark:border-border-dark"
                                    >
                                        <tr>
                                            <th class="px-6 py-4 font-semibold"
                                                >Application</th
                                            >
                                            <th class="px-6 py-4 font-semibold"
                                                >Service</th
                                            >
                                            <th class="px-6 py-4 font-semibold"
                                                >Key</th
                                            >
                                            <th class="px-6 py-4 font-semibold"
                                                >Value</th
                                            >
                                            <th
                                                class="px-6 py-4 font-semibold w-[100px] text-right"
                                                >Action</th
                                            >
                                        </tr>
                                    </thead>
                                    <tbody
                                        class="divide-y divide-slate-100 dark:divide-slate-800"
                                    >
                                        {#each filteredGlobalParams as param}
                                            <tr
                                                class="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                            >
                                                <td
                                                    class="px-6 py-4 font-medium"
                                                    ><span
                                                        class="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                        >{param.application}</span
                                                    ></td
                                                >
                                                <td
                                                    class="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-xs"
                                                >
                                                    <div
                                                        class="flex gap-1 flex-wrap"
                                                    >
                                                        {#if param.service && param.service.length > 0}
                                                            {#each param.service as s}
                                                                <span
                                                                    class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                                                                    >{s}</span
                                                                >
                                                            {/each}
                                                        {:else}
                                                            <!-- If All (empty), show all configured services for this app -->
                                                            {#each getServicesForApp(param.application) as s}
                                                                <span
                                                                    class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                                                                    >{s}</span
                                                                >
                                                            {/each}
                                                        {/if}
                                                    </div>
                                                </td>
                                                <td
                                                    class="px-6 py-4 font-medium text-slate-700 dark:text-slate-300"
                                                    >{param.key}</td
                                                >
                                                <td
                                                    class="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs max-w-xs truncate"
                                                    title={param.value}
                                                    >{param.value}</td
                                                >
                                                <td
                                                    class="px-6 py-4 text-right"
                                                >
                                                    <div
                                                        class="flex items-center justify-end"
                                                    >
                                                        <button
                                                            class="p-1 text-slate-400 hover:text-blue-500 transition-colors mr-1"
                                                            onclick={() =>
                                                                editGlobalParameter(
                                                                    param,
                                                                )}
                                                            ><span
                                                                class="material-symbols-outlined text-[18px]"
                                                                >edit</span
                                                            ></button
                                                        >
                                                        <button
                                                            class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                            onclick={() =>
                                                                settingsStore.removeGlobalParameter(
                                                                    param.id,
                                                                )}
                                                            ><span
                                                                class="material-symbols-outlined text-[18px]"
                                                                >delete</span
                                                            ></button
                                                        >
                                                    </div>
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    {:else if activeSubTab === "options"}
                        <!-- Parameter Options Content -->
                        <div
                            class="mb-8 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark"
                        >
                            <h3
                                class="text-base font-bold text-slate-800 dark:text-white mb-4"
                            >
                                {editingId
                                    ? "Edit Option Set"
                                    : "Create Option Set"}
                            </h3>
                            <div class="flex flex-col gap-4">
                                <div
                                    class="flex flex-col md:flex-row gap-4 items-end"
                                >
                                    <label
                                        class="flex flex-col gap-1 w-full md:w-1/3"
                                    >
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Application</span
                                        >
                                        <select
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
                                            bind:value={paramOption.application}
                                            onchange={() =>
                                                (selectedOptionService = [])}
                                        >
                                            <option value="" disabled selected
                                                >Select Application</option
                                            >
                                            {#each $profileStore.myApplications as app}
                                                <option value={app.appName}
                                                    >{app.appName}</option
                                                >
                                            {/each}
                                        </select>
                                    </label>
                                    {#if getServicesForApp(paramOption.application).length > 0}
                                        <div class="w-full md:w-1/3">
                                            <div
                                                class="flex flex-col gap-1 w-full"
                                            >
                                                <span
                                                    class="text-xs font-semibold text-slate-500 uppercase"
                                                    >Service</span
                                                >
                                                <MultiSelectBox
                                                    bind:value={
                                                        selectedOptionService
                                                    }
                                                    options={getServicesForApp(
                                                        paramOption.application,
                                                    )}
                                                    placeholder="Select Service"
                                                />
                                            </div>
                                        </div>
                                    {/if}
                                </div>

                                <label class="flex flex-col gap-1">
                                    <span
                                        class="text-xs font-semibold text-slate-500 uppercase"
                                        >Parameter Name</span
                                    >
                                    <input
                                        type="text"
                                        placeholder="e.g. payMethod"
                                        class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                        bind:value={paramOption.name}
                                    />
                                </label>
                                <div
                                    class="p-4 border border-slate-200 dark:border-border-dark rounded-lg bg-white dark:bg-card-dark"
                                >
                                    <div class="flex gap-3 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Code"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all flex-1"
                                            bind:value={paramOption.code}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Value"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all flex-1"
                                            bind:value={paramOption.value}
                                        />
                                        <button
                                            class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-slate-600 min-w-[100px]"
                                            onclick={addOptionToCurrent}
                                        >
                                            {editingOptionIndex !== null
                                                ? "Update"
                                                : "Add Value"}
                                        </button>
                                        {#if editingOptionIndex !== null}
                                            <button
                                                class="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500 dark:text-slate-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-slate-600"
                                                onclick={cancelOptionValueEdit}
                                                title="Cancel Edit"
                                            >
                                                <span
                                                    class="material-symbols-outlined text-[18px]"
                                                    >close</span
                                                >
                                            </button>
                                        {/if}
                                    </div>
                                    <div class="flex flex-wrap gap-2">
                                        {#each currentOptions as opt, i}
                                            <button
                                                class="px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border transition-colors {editingOptionIndex ===
                                                i
                                                    ? 'bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20'
                                                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/30'}"
                                                onclick={() =>
                                                    editOptionValue(i)}
                                                type="button"
                                            >
                                                <span class="font-bold"
                                                    >{opt.code}</span
                                                >: {opt.value}
                                                <span
                                                    role="button"
                                                    tabindex="0"
                                                    aria-label="Remove option"
                                                    class="ml-1 hover:text-red-500 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center outline-none focus:ring-2 focus:ring-red-500/50"
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        if (
                                                            editingOptionIndex ===
                                                            i
                                                        ) {
                                                            cancelOptionValueEdit();
                                                        } else if (
                                                            editingOptionIndex !==
                                                                null &&
                                                            i <
                                                                editingOptionIndex
                                                        ) {
                                                            editingOptionIndex--;
                                                        }
                                                        currentOptions =
                                                            currentOptions.filter(
                                                                (_, idx) =>
                                                                    idx !== i,
                                                            );
                                                    }}
                                                    onkeydown={(e) => {
                                                        if (
                                                            e.key === "Enter" ||
                                                            e.key === " "
                                                        ) {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (
                                                                editingOptionIndex ===
                                                                i
                                                            ) {
                                                                cancelOptionValueEdit();
                                                            } else if (
                                                                editingOptionIndex !==
                                                                    null &&
                                                                i <
                                                                    editingOptionIndex
                                                            ) {
                                                                editingOptionIndex--;
                                                            }
                                                            currentOptions =
                                                                currentOptions.filter(
                                                                    (_, idx) =>
                                                                        idx !==
                                                                        i,
                                                                );
                                                        }
                                                    }}>×</span
                                                >
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                                <div class="flex justify-end gap-2">
                                    {#if editingId}
                                        <button
                                            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onclick={cancelEdit}
                                        >
                                            Cancel
                                        </button>
                                    {/if}
                                    <button
                                        class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!paramOption.application ||
                                            !paramOption.name ||
                                            currentOptions.length === 0 ||
                                            (paramOption.application ===
                                                "WPAY" &&
                                                !selectedOptionService)}
                                        onclick={saveParameterOption}
                                        >{editingId
                                            ? "Update Option Set"
                                            : "Save Option Set"}</button
                                    >
                                </div>
                            </div>
                        </div>

                        <!-- List Filter Toolbar (Visible only if WPAY is selected in Header) -->
                        {#if $appStateStore.selectedApp === "WPAY"}
                            <div class="mb-4 flex justify-end">
                                <div class="w-48">
                                    <select
                                        class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white"
                                        bind:value={listFilterServiceOptions}
                                    >
                                        <option value="">All Services</option>
                                        {#each SERVICE_OPTIONS as service}
                                            <option value={service}
                                                >{service}</option
                                            >
                                        {/each}
                                    </select>
                                </div>
                            </div>
                        {/if}

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {#each filteredParameterOptions as opt}
                                <div
                                    class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:shadow-md transition-shadow group relative"
                                >
                                    <div
                                        class="flex justify-between items-start mb-3"
                                    >
                                        <div class="flex flex-col gap-1">
                                            <div
                                                class="flex gap-2 items-center flex-wrap"
                                            >
                                                <span
                                                    class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                    >{opt.application}</span
                                                >
                                                {#if opt.service && opt.service.length > 0}
                                                    {#each opt.service as s}
                                                        <span
                                                            class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400"
                                                            >{s}</span
                                                        >
                                                    {/each}
                                                {/if}
                                            </div>
                                            <h4
                                                class="font-bold flex-1 text-slate-900 dark:text-white"
                                            >
                                                {opt.name}
                                            </h4>
                                        </div>
                                        <div
                                            class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <button
                                                class="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                                onclick={() =>
                                                    editParameterOption(opt)}
                                                title="Edit"
                                            >
                                                <span
                                                    class="material-symbols-outlined text-[18px]"
                                                    >edit</span
                                                >
                                            </button>
                                            <button
                                                class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                onclick={() =>
                                                    settingsStore.removeParameterOption(
                                                        opt.id,
                                                    )}
                                                title="Delete"
                                                ><span
                                                    class="material-symbols-outlined text-[18px]"
                                                    >delete</span
                                                ></button
                                            >
                                        </div>
                                    </div>
                                    <div class="space-y-1">
                                        {#each opt.options as val}
                                            <div
                                                class="flex justify-between text-sm"
                                            >
                                                <span
                                                    class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded"
                                                    >{val.code}</span
                                                ><span class="text-slate-600"
                                                    >{val.value}</span
                                                >
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else if activeSubTab === "mid"}
                        <!-- MID Context Content -->
                        <div
                            class="mb-8 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark"
                        >
                            <h3
                                class="text-base font-bold text-slate-800 dark:text-white mb-4"
                            >
                                {editingMidId
                                    ? "Edit MID Context"
                                    : "Add MID Context"}
                            </h3>
                            <div class="grid grid-cols-1 gap-4">
                                <div
                                    class="flex flex-col md:flex-row gap-4 items-end"
                                >
                                    <label
                                        class="flex flex-col gap-1 w-full md:w-1/3"
                                    >
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Application</span
                                        >
                                        <select
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
                                            bind:value={midContext.application}
                                            onchange={() =>
                                                (selectedMidService = [])}
                                        >
                                            <option value="" disabled selected
                                                >Select Application</option
                                            >
                                            {#each $profileStore.myApplications as app}
                                                <option value={app.appName}
                                                    >{app.appName}</option
                                                >
                                            {/each}
                                        </select>
                                    </label>
                                    {#if midContext.application?.toUpperCase() === "WPAY"}
                                        <div class="w-full md:w-1/3">
                                            <div
                                                class="flex flex-col gap-1 w-full"
                                            >
                                                <span
                                                    class="text-xs font-semibold text-slate-500 uppercase"
                                                    >Service</span
                                                >
                                                <MultiSelectBox
                                                    bind:value={
                                                        selectedMidService
                                                    }
                                                    options={[
                                                        ...SERVICE_OPTIONS,
                                                    ]}
                                                    placeholder="Select Service"
                                                />
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <label class="flex flex-col gap-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >MID</span
                                        ><input
                                            type="text"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                            bind:value={midContext.mid}
                                        />
                                    </label>
                                    <label class="flex flex-col gap-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Hash Key</span
                                        ><input
                                            type="text"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                            bind:value={midContext.hashKey}
                                        />
                                    </label>
                                </div>
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <label class="flex flex-col gap-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Enc Key</span
                                        ><input
                                            type="text"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                            bind:value={midContext.encKey}
                                        />
                                    </label>
                                    <label class="flex flex-col gap-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Enc IV</span
                                        ><input
                                            type="text"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                            bind:value={midContext.encIV}
                                        />
                                    </label>
                                </div>
                                <div class="flex justify-end gap-2">
                                    {#if editingMidId}
                                        <button
                                            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onclick={cancelMidEdit}
                                        >
                                            Cancel
                                        </button>
                                    {/if}
                                    <button
                                        class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        onclick={addMidContext}
                                        disabled={!midContext.application ||
                                            !midContext.mid ||
                                            (midContext.application ===
                                                "WPAY" &&
                                                !selectedMidService)}
                                        >{editingMidId
                                            ? "Update Context"
                                            : "Add Context"}</button
                                    >
                                </div>
                            </div>
                        </div>

                        <!-- List Filter Toolbar (Visible only if WPAY is selected in Header) -->
                        {#if $appStateStore.selectedApp === "WPAY"}
                            <div class="mb-4 flex justify-end">
                                <div class="w-48">
                                    <select
                                        class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-border-dark rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white"
                                        bind:value={listFilterMidServiceOptions}
                                    >
                                        <option value="">All Services</option>
                                        {#each SERVICE_OPTIONS as service}
                                            <option value={service}
                                                >{service}</option
                                            >
                                        {/each}
                                    </select>
                                </div>
                            </div>
                        {/if}

                        <div
                            class="overflow-x-auto rounded-lg border border-slate-200 dark:border-border-dark"
                        >
                            <table class="w-full text-sm text-left">
                                <thead
                                    class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-background-dark border-b border-slate-200 dark:border-border-dark"
                                >
                                    <tr
                                        ><th class="px-6 py-4">MID</th><th
                                            class="px-6 py-4">Keys</th
                                        ><th class="px-6 py-4 text-right"
                                            >Action</th
                                        ></tr
                                    >
                                </thead>
                                <tbody
                                    class="divide-y divide-slate-100 dark:divide-slate-800"
                                >
                                    {#each filteredMidContexts as ctx}
                                        <tr
                                            class="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <td
                                                class="px-6 py-4 font-mono font-medium"
                                            >
                                                <div
                                                    class="flex flex-col gap-1"
                                                >
                                                    <div
                                                        class="flex gap-2 items-center mb-1"
                                                    >
                                                        <span
                                                            class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                            >{ctx.application}</span
                                                        >
                                                        {#if ctx.service && ctx.service.length > 0}
                                                            {#if ctx.service.length === SERVICE_OPTIONS.length}
                                                                <span
                                                                    class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400"
                                                                    >All</span
                                                                >
                                                            {:else}
                                                                {#each ctx.service as s}
                                                                    <span
                                                                        class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400 mr-1"
                                                                        >{s}</span
                                                                    >
                                                                {/each}
                                                            {/if}
                                                        {/if}
                                                    </div>
                                                    <span
                                                        class="text-slate-900 dark:text-white"
                                                    >
                                                        {ctx.mid}
                                                    </span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div
                                                    class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs"
                                                >
                                                    <span class="text-slate-500"
                                                        >Hash:</span
                                                    ><span
                                                        class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded"
                                                        >{ctx.hashKey}</span
                                                    >
                                                    <span class="text-slate-500"
                                                        >EncKey:</span
                                                    >
                                                    <span
                                                        class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded"
                                                        >{ctx.encKey}</span
                                                    >
                                                    {#if ctx.encIV}
                                                        <span
                                                            class="text-slate-500"
                                                            >EncIV:</span
                                                        >
                                                        <span
                                                            class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded"
                                                            >{ctx.encIV}</span
                                                        >
                                                    {/if}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-right">
                                                <div
                                                    class="flex justify-end gap-1"
                                                >
                                                    <button
                                                        class="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                                        onclick={() =>
                                                            editMidContext(ctx)}
                                                        title="Edit"
                                                    >
                                                        <span
                                                            class="material-symbols-outlined text-[18px]"
                                                            >edit</span
                                                        >
                                                    </button>
                                                    <button
                                                        class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                        onclick={() =>
                                                            settingsStore.removeMidContext(
                                                                ctx.id,
                                                            )}
                                                    >
                                                        <span
                                                            class="material-symbols-outlined text-[18px]"
                                                            >delete</span
                                                        >
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                </div>
            {:else if activeCategory === "interface"}
                <!-- Interface Settings Content -->
                <div class="p-6">
                    <h2
                        class="text-xl font-bold text-slate-900 dark:text-white mb-6"
                    >
                        Interface Settings
                    </h2>

                    <!-- Sidebar Config -->
                    <section class="mb-10">
                        <h3
                            class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"
                        >
                            <span
                                class="material-symbols-outlined text-slate-400"
                                >dock_to_right</span
                            >
                            Sidebar Menu
                        </h3>
                        <div
                            class="bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-200 dark:border-border-dark p-1"
                        >
                            <div
                                class="grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-800"
                            >
                                {#each Object.entries($settingsStore.interface.sidebar) as [key, enabled]}
                                    <div
                                        class="p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        <div class="flex flex-col">
                                            <span
                                                class="font-medium text-slate-900 dark:text-slate-100 capitalize"
                                                >{key.replace("show", "")}</span
                                            >
                                            <span
                                                class="text-xs text-slate-500 dark:text-slate-400"
                                                >Toggle visibility of {key.replace(
                                                    "show",
                                                    "",
                                                )} menu item.</span
                                            >
                                        </div>
                                        <label
                                            class="relative inline-flex items-center cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                class="sr-only peer"
                                                checked={enabled}
                                                onchange={(e) =>
                                                    updateInterface(
                                                        "sidebar",
                                                        key,
                                                        e.currentTarget.checked,
                                                    )}
                                            />
                                            <div
                                                class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                                            ></div>
                                        </label>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </section>

                    <!-- Dashboard Config -->
                    <section>
                        <h3
                            class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"
                        >
                            <span
                                class="material-symbols-outlined text-slate-400"
                                >dashboard</span
                            >
                            Dashboard Widgets
                        </h3>
                        <div
                            class="bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-200 dark:border-border-dark p-1"
                        >
                            <div
                                class="grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-800"
                            >
                                {#each Object.entries($settingsStore.interface.dashboard) as [key, enabled]}
                                    <div
                                        class="p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        <div class="flex flex-col">
                                            <span
                                                class="font-medium text-slate-900 dark:text-slate-100 capitalize"
                                                >{key
                                                    .replace("show", "")
                                                    .replace(/([A-Z])/g, " $1")
                                                    .trim()}</span
                                            >
                                            <span
                                                class="text-xs text-slate-500 dark:text-slate-400"
                                                >Manage display data on
                                                dashboard.</span
                                            >
                                        </div>
                                        <label
                                            class="relative inline-flex items-center cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                class="sr-only peer"
                                                checked={enabled}
                                                onchange={(e) =>
                                                    updateInterface(
                                                        "dashboard",
                                                        key,
                                                        e.currentTarget.checked,
                                                    )}
                                            />
                                            <div
                                                class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                                            ></div>
                                        </label>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </section>
                </div>
            {:else if activeCategory === "application"}
                <div class="border-b border-slate-200 dark:border-border-dark">
                    <div class="flex overflow-x-auto">
                        <button
                            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeAppSubTab ===
                            'settings'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                            onclick={() => (activeAppSubTab = "settings")}
                        >
                            Application Settings
                        </button>
                        <button
                            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeAppSubTab ===
                            'site'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                            onclick={() => (activeAppSubTab = "site")}
                        >
                            Site Context
                        </button>
                    </div>
                </div>

                <!-- Application Settings Content -->
                {#if activeAppSubTab === "settings"}
                    <div class="p-6">
                        <h2
                            class="text-xl font-bold text-slate-900 dark:text-white mb-6"
                        >
                            Application Settings
                        </h2>

                        <!-- Add/Edit Form -->
                        <div
                            class="mb-8 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark"
                        >
                            <h3
                                class="text-base font-bold text-slate-800 dark:text-white mb-4"
                            >
                                {editingAppId
                                    ? "Edit Application"
                                    : "Add Application"}
                            </h3>
                            <div class="flex flex-col gap-4">
                                <div
                                    class="flex flex-col md:flex-row gap-4 items-start"
                                >
                                    <label
                                        class="flex flex-col gap-1 w-full md:w-1/3"
                                    >
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Application Name</span
                                        >
                                        <input
                                            type="text"
                                            placeholder="e.g. WPAY"
                                            list="app-suggestions"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                                            bind:value={appForm.appName}
                                        />
                                        <datalist id="app-suggestions">
                                            {#each APP_OPTIONS as opt}
                                                <option value={opt.name}
                                                    >{opt.description}</option
                                                >
                                            {/each}
                                        </datalist>
                                    </label>
                                    <label class="flex flex-col gap-1 flex-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Description</span
                                        >
                                        <input
                                            type="text"
                                            placeholder="Brief description"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                            bind:value={appForm.description}
                                        />
                                    </label>
                                </div>

                                <!-- Service Distinction Toggle -->
                                <div>
                                    <label
                                        class="inline-flex items-center cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            class="sr-only peer"
                                            bind:checked={
                                                appForm.useServiceDistinction
                                            }
                                        />
                                        <div
                                            class="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                                        ></div>
                                        <span
                                            class="ms-3 text-sm font-medium text-slate-700 dark:text-slate-300"
                                            >Use Service Distinction (Manage
                                            Multiple Services)</span
                                        >
                                    </label>
                                </div>

                                {#if appForm.useServiceDistinction}
                                    <!-- Services Management List -->
                                    <div class="flex flex-col gap-4">
                                        <div
                                            class="flex justify-between items-center"
                                        >
                                            <h4
                                                class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                                            >
                                                Services List
                                            </h4>
                                            <button
                                                class="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                                                onclick={addAppService}
                                            >
                                                <span
                                                    class="material-symbols-outlined text-[16px]"
                                                    >add_circle</span
                                                >
                                                Add Service
                                            </button>
                                        </div>

                                        {#if appForm.services.length === 0}
                                            <div
                                                class="p-4 rounded-lg bg-orange-50 border border-orange-100 text-sm text-orange-600 dark:bg-orange-900/10 dark:border-orange-900/30 flex gap-2"
                                            >
                                                <span
                                                    class="material-symbols-outlined text-[20px]"
                                                    >warning</span
                                                >
                                                <span
                                                    >Please add at least one
                                                    service.</span
                                                >
                                            </div>
                                        {/if}

                                        {#each appForm.services as service, sIdx}
                                            <div
                                                class="bg-white dark:bg-card-dark p-4 rounded-lg border border-slate-200 dark:border-slate-700 relative group"
                                            >
                                                <button
                                                    class="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors"
                                                    onclick={() =>
                                                        removeAppService(
                                                            service.id,
                                                        )}
                                                    tabindex="-1"
                                                >
                                                    <span
                                                        class="material-symbols-outlined text-[18px]"
                                                        >close</span
                                                    >
                                                </button>

                                                <div class="mb-3 w-1/3">
                                                    <label
                                                        for="service-name-{service.id}"
                                                        class="block text-xs font-semibold text-slate-500 uppercase mb-1"
                                                        >Service Name</label
                                                    >
                                                    <!-- svelte-ignore a11y_autofocus -->
                                                    <input
                                                        type="text"
                                                        bind:value={
                                                            service.name
                                                        }
                                                        placeholder="e.g. wpaystd"
                                                        class="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                                        autofocus
                                                    />
                                                </div>

                                                <div
                                                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
                                                >
                                                    {#each ["dev", "stg", "pGlb", "pKs", "pFc"] as domainKey}
                                                        <div
                                                            class="flex flex-col gap-1"
                                                        >
                                                            <span
                                                                class="text-[10px] font-bold text-slate-500 uppercase"
                                                                >{domainKey}</span
                                                            >
                                                            <input
                                                                type="text"
                                                                placeholder={`https://${domainKey}...`}
                                                                class="px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                                                bind:value={
                                                                    (
                                                                        service.domains as any
                                                                    )[domainKey]
                                                                }
                                                            />
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                {:else}
                                    <!-- Single App Domains -->
                                    <div
                                        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white dark:bg-card-dark p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                                    >
                                        {#each ["dev", "stg", "pGlb", "pKs", "pFc"] as domainKey}
                                            <div class="flex flex-col gap-1">
                                                <span
                                                    class="text-[10px] font-bold text-slate-500 uppercase"
                                                    >{domainKey}</span
                                                >
                                                <input
                                                    type="text"
                                                    placeholder={`https://${domainKey}...`}
                                                    class="px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                                                    bind:value={
                                                        (
                                                            appForm.domains as any
                                                        )[domainKey]
                                                    }
                                                />
                                            </div>
                                        {/each}
                                    </div>
                                {/if}

                                <div
                                    class="flex items-center justify-end gap-2 mt-2"
                                >
                                    {#if editingAppId}
                                        <button
                                            class="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                            onclick={cancelAppEdit}
                                            >Cancel</button
                                        >
                                    {/if}
                                    <button
                                        class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        onclick={saveApplication}
                                        disabled={!appForm.appName}
                                    >
                                        {editingAppId
                                            ? "Update App"
                                            : "Add App"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- App List -->
                        <div
                            class="overflow-x-auto rounded-lg border border-slate-200 dark:border-border-dark"
                        >
                            <table class="w-full text-sm text-left">
                                <thead
                                    class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-background-dark border-b border-slate-200 dark:border-border-dark"
                                >
                                    <tr>
                                        <th class="px-6 py-4">Application</th>
                                        <th class="px-6 py-4">Setting</th>
                                        <th class="px-6 py-4 text-right"
                                            >Action</th
                                        >
                                    </tr>
                                </thead>
                                <tbody
                                    class="divide-y divide-slate-100 dark:divide-slate-800"
                                >
                                    {#if $settingsStore.applications && $settingsStore.applications.length > 0}
                                        {#each $settingsStore.applications as app}
                                            <tr
                                                class="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                            >
                                                <td class="px-6 py-4">
                                                    <div
                                                        class="flex flex-col gap-0.5"
                                                    >
                                                        <span
                                                            class="font-medium text-slate-900 dark:text-white"
                                                            >{app.appName}</span
                                                        >
                                                        {#if app.description}
                                                            <span
                                                                class="text-xs text-slate-500"
                                                                >{app.description}</span
                                                            >
                                                        {/if}
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4">
                                                    {#if app.useServiceDistinction}
                                                        <div
                                                            class="flex flex-col gap-1"
                                                        >
                                                            <span
                                                                class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 w-fit"
                                                            >
                                                                Service
                                                                Distinction ON
                                                            </span>
                                                            {#if app.services && app.services.length > 0}
                                                                <div
                                                                    class="flex flex-wrap gap-1 mt-1"
                                                                >
                                                                    {#each app.services as svc}
                                                                        <span
                                                                            class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
                                                                        >
                                                                            {svc.name}
                                                                        </span>
                                                                    {/each}
                                                                </div>
                                                            {:else}
                                                                <span
                                                                    class="text-[10px] text-red-500"
                                                                    >(No
                                                                    services
                                                                    configured)</span
                                                                >
                                                            {/if}
                                                        </div>
                                                    {:else}
                                                        <div
                                                            class="flex flex-col gap-1"
                                                        >
                                                            <span
                                                                class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 w-fit"
                                                            >
                                                                Global Only
                                                            </span>
                                                            <div
                                                                class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-500"
                                                            >
                                                                <span
                                                                    >DEV: {app
                                                                        .domains
                                                                        ?.dev ||
                                                                        "-"}</span
                                                                >
                                                                <span
                                                                    >STG: {app
                                                                        .domains
                                                                        ?.stg ||
                                                                        "-"}</span
                                                                >
                                                                <span
                                                                    >GLB: {app
                                                                        .domains
                                                                        ?.pGlb ||
                                                                        "-"}</span
                                                                >
                                                            </div>
                                                        </div>
                                                    {/if}
                                                </td>
                                                <td
                                                    class="px-6 py-4 text-right"
                                                >
                                                    <div
                                                        class="flex justify-end gap-1"
                                                    >
                                                        <button
                                                            class="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                                                            onclick={() =>
                                                                editApplication(
                                                                    app,
                                                                )}
                                                        >
                                                            <span
                                                                class="material-symbols-outlined text-[18px]"
                                                                >edit</span
                                                            >
                                                        </button>
                                                        <button
                                                            class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                            onclick={() =>
                                                                deleteApplication(
                                                                    app.id,
                                                                )}
                                                        >
                                                            <span
                                                                class="material-symbols-outlined text-[18px]"
                                                                >delete</span
                                                            >
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        {/each}
                                    {:else}
                                        <tr>
                                            <td
                                                colspan="3"
                                                class="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                                            >
                                                No applications configured. Add
                                                one above.
                                            </td>
                                        </tr>
                                    {/if}
                                </tbody>
                            </table>
                        </div>
                    </div>
                {/if}

                {#if activeAppSubTab === "site"}
                    <div class="p-6">
                        <div
                            class="mb-8 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark"
                        >
                            <h3
                                class="text-base font-bold text-slate-800 dark:text-white mb-4"
                            >
                                Add Site Context
                            </h3>
                            <div
                                class="flex flex-col md:flex-row gap-4 items-end"
                            >
                                <label
                                    class="flex flex-col gap-1 w-full md:w-1/3"
                                >
                                    <span
                                        class="text-xs font-semibold text-slate-500 uppercase"
                                        >Application</span
                                    >
                                    <select
                                        class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                        disabled
                                        value="WPAY"
                                    >
                                        <option value="WPAY">WPAY</option>
                                    </select>
                                </label>
                                <label
                                    class="flex flex-col gap-1 w-full md:w-1/3"
                                >
                                    <span
                                        class="text-xs font-semibold text-slate-500 uppercase"
                                        >Service</span
                                    >
                                    <select
                                        class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                        bind:value={siteContext.service}
                                    >
                                        <option value="" disabled selected
                                            >Select Service</option
                                        >
                                        {#each availableServicesForSiteContext as s}
                                            <option value={s}>{s}</option>
                                        {/each}
                                    </select>
                                </label>
                                <div class="w-full md:w-auto">
                                    <button
                                        class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                                        onclick={addSiteContext}
                                        disabled={!siteContext.service}
                                    >
                                        Add Context
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div
                            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                            {#each filteredSiteContexts as ctx}
                                <div
                                    class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:shadow-md transition-shadow group relative flex flex-col h-full"
                                >
                                    <div
                                        class="flex justify-between items-start mb-3"
                                    >
                                        <div class="flex flex-col gap-1">
                                            <span
                                                class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 w-fit"
                                            >
                                                {ctx.application}
                                            </span>
                                            <h4
                                                class="font-bold text-lg text-slate-900 dark:text-white"
                                            >
                                                {ctx.service}
                                            </h4>
                                        </div>
                                        <button
                                            class="p-1 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            onclick={() =>
                                                removeSiteContext(ctx.id)}
                                            title="Delete Site Context"
                                        >
                                            <span
                                                class="material-symbols-outlined text-[18px]"
                                                >delete</span
                                            >
                                        </button>
                                    </div>

                                    <div
                                        class="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex flex-col gap-2"
                                    >
                                        <div
                                            class="text-xs font-semibold text-slate-500 uppercase mb-1 flex justify-between items-center"
                                        >
                                            <span>Sites</span>
                                            <span
                                                class="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300"
                                                >{ctx.sites.length}</span
                                            >
                                        </div>

                                        <div class="flex flex-wrap gap-2">
                                            {#each ctx.sites as site}
                                                <span
                                                    class="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 shadow-sm group/site"
                                                >
                                                    {site}
                                                    <button
                                                        onclick={() =>
                                                            removeSite(
                                                                ctx.id,
                                                                site,
                                                            )}
                                                        class="hover:text-red-500 transition-colors hidden group-hover/site:block"
                                                        aria-label="Remove site"
                                                    >
                                                        <span
                                                            class="material-symbols-outlined text-[12px] font-bold"
                                                            >close</span
                                                        >
                                                    </button>
                                                </span>
                                            {/each}
                                        </div>

                                        {#if addingSiteToContextId === ctx.id}
                                            <div
                                                class="mt-2 flex gap-2 animate-in fade-in zoom-in-95 duration-200"
                                            >
                                                <!-- svelte-ignore a11y_autofocus -->
                                                <input
                                                    type="text"
                                                    class="flex-1 px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 focus:outline-none focus:border-primary dark:text-white dark:placeholder-slate-400"
                                                    placeholder="Site Name"
                                                    bind:value={newSiteName}
                                                    onkeydown={(e) =>
                                                        e.key === "Enter" &&
                                                        addSite(ctx.id)}
                                                    autofocus
                                                />
                                                <button
                                                    class="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                                    onclick={() =>
                                                        addSite(ctx.id)}
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    class="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs hover:bg-slate-300"
                                                    onclick={() => {
                                                        addingSiteToContextId =
                                                            null;
                                                        newSiteName = "";
                                                    }}
                                                >
                                                    Esc
                                                </button>
                                            </div>
                                        {:else}
                                            <button
                                                class="mt-auto w-full py-1.5 text-xs text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-dashed border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-1"
                                                onclick={() => {
                                                    addingSiteToContextId =
                                                        ctx.id;
                                                    newSiteName = "";
                                                }}
                                            >
                                                <span
                                                    class="material-symbols-outlined text-[14px]"
                                                    >add</span
                                                >
                                                Add Site
                                            </button>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/if}
        </main>
    </div>
</div>

<AlertModal
    bind:isOpen={alertModalState.isOpen}
    title={alertModalState.title}
    message={alertModalState.message}
    type={alertModalState.type}
    onConfirm={alertModalState.onConfirm}
/>
