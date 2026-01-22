<script lang="ts">
    import { settingsStore } from "$lib/stores/settingsStore";
    import { page } from "$app/stores";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { profileStore } from "$lib/stores/profileStore";
    import { authStore, loginWithGoogle } from "$lib/services/authService";
    import { driveService } from "$lib/services/driveService";
    import { SERVICE_OPTIONS } from "$lib/constants/wpayServerType";
    import { onMount, tick } from "svelte";
    import { get } from "svelte/store";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";

    let activeCategory = $state("endpoint"); // 'endpoint', 'interface'
    let activeSubTab = $state("global"); // for endpoint: 'global', 'options', 'mid'

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

    let selectedService = $state(""); // For Global Params ADD form
    let selectedOptionService = $state(""); // For Param Options ADD form
    let paramOption = $state({
        application: "",
        service: "",
        name: "",
        code: "",
        value: "",
    });
    let midContext = $state({
        application: "",
        service: "",
        mid: "",
        encKey: "",
        encIV: "",
        hashKey: "",
    });
    let selectedMidService = $state("");
    let listFilterMidServiceOptions = $state("");

    // Temporary state for adding options to a new parameter option set
    let currentOptions = $state<{ code: string; value: string }[]>([]);
    let editingOptionIndex = $state<number | null>(null); // Track index of option being edited
    let editingId = $state<string | null>(null);
    let editingMidId = $state<string | null>(null);

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

        return $settingsStore.globalParameters.filter((param) => {
            if (!isAll && param.application !== headerApp) return false;
            // Strict match for service filter if WPAY
            if (
                headerApp === "WPAY" &&
                listFilterService &&
                listFilterService !== "All"
            ) {
                return param.service === listFilterService;
            }
            return true;
        });
    });

    let filteredParameterOptions = $derived.by(() => {
        const headerApp = $appStateStore.selectedApp;
        const isAll = !headerApp || headerApp === "All";

        return $settingsStore.parameterOptions.filter((opt) => {
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
                return opt.service === listFilterServiceOptions;
            }

            return true;
        });
    });

    let filteredMidContexts = $derived.by(() => {
        const headerApp = $appStateStore.selectedApp;
        const isAll = !headerApp || headerApp === "All";

        return $settingsStore.midContexts.filter((ctx) => {
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
                return ctx.service === listFilterMidServiceOptions;
            }

            return true;
        });
    });

    function addGlobalParam() {
        if (!globalParam.application || !globalParam.key || !globalParam.value)
            return;

        // Validation: If WPAY, Service is required (unless 'WPAY'/'All' is valid service choice? User said "Service choice is mandatory")
        // "Application is Wpay then Service select also mandatory"
        if (globalParam.application === "WPAY" && !selectedService) return;

        // If selectedService is "WPAY" (All), do we treat it as undefined service or specific "WPAY" service?
        // Based on UI: <option value="WPAY">All</option>.
        // Taking "All" usually means applies to all, or no specific service.
        // But user said "Service select mandatory".

        const newParam = {
            ...globalParam,
            service: selectedService === "WPAY" ? undefined : selectedService, // Store undefined if 'All' is selected, or maybe 'WPAY'?
            // Let's verify requirement: "Application is Wpay then Service information also show".
            // Let's store actual selected value.
        };

        if (newParam.application === "WPAY" && selectedService !== "WPAY") {
            newParam.service = selectedService;
        }

        settingsStore.addGlobalParameter(newParam);

        // Reset KEY and VALUE only, keep App/Service for continuous entry
        globalParam.key = "";
        globalParam.value = "";
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
        if (paramOption.application === "WPAY" && !selectedOptionService)
            return;

        const newOption = {
            ...paramOption,
            service:
                paramOption.application === "WPAY" &&
                selectedOptionService !== "WPAY"
                    ? selectedOptionService
                    : undefined,
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
            service: opt.service || "",
            name: opt.name,
            code: "",
            value: "",
        };
        selectedOptionService = opt.service || "";
        currentOptions = [...opt.options];

        // Ensure service dropdown is shown if editing WPAY app
        if (opt.application === "WPAY" && !selectedOptionService) {
            // If service was undefined but app is WPAY (e.g. All), set it to empty or WPAY?
            // Based on logic: (paramOption.application === "WPAY" && selectedOptionService !== "WPAY") ? selectedOptionService : undefined
            // If stored as undefined, it means 'All' (value="WPAY")
            selectedOptionService = "WPAY";
        }
    }

    function cancelEdit() {
        editingId = null;
        paramOption = {
            application: "",
            service: "",
            name: "",
            code: "",
            value: "",
        };
        selectedOptionService = "";
        currentOptions = [];
        editingOptionIndex = null;
    }

    function addMidContext() {
        if (!midContext.mid || !midContext.application) return;

        // Validate Service if App is WPAY
        if (midContext.application === "WPAY" && !selectedMidService) return;

        const newContext = {
            ...midContext,
            service:
                midContext.application === "WPAY" &&
                selectedMidService !== "WPAY"
                    ? selectedMidService
                    : undefined,
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
        selectedMidService = ctx.service || "";

        // Ensure service dropdown is shown/set if editing WPAY app
        if (ctx.application === "WPAY" && !selectedMidService) {
            selectedMidService = "WPAY";
        }
    }

    function cancelMidEdit() {
        editingMidId = null;
        midContext = {
            application: "",
            service: "",
            mid: "",
            encKey: "",
            encIV: "",
            hashKey: "",
        };
        selectedMidService = "";
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
    ];
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
                                                    (selectedService = "")}
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
                                    {#if globalParam.application?.toUpperCase() === "WPAY"}
                                        <div class="w-full md:w-1/3">
                                            <select
                                                class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
                                                bind:value={selectedService}
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    selected
                                                    >Select Service</option
                                                >
                                                <option value="WPAY">All</option
                                                >
                                                {#each SERVICE_OPTIONS as service}
                                                    <option value={service}
                                                        >{service}</option
                                                    >
                                                {/each}
                                            </select>
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
                                        class="flex items-end w-full md:w-auto"
                                    >
                                        <button
                                            class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto whitespace-nowrap"
                                            disabled={!globalParam.application ||
                                                !globalParam.key ||
                                                !globalParam.value ||
                                                (globalParam.application ===
                                                    "WPAY" &&
                                                    !selectedService)}
                                            onclick={addGlobalParam}>Add</button
                                        >
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Parameters List -->
                        <div
                            class="bg-white dark:bg-card-dark rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden"
                        >
                            <!-- List Filter Toolbar (Visible only if WPAY is selected in Header) -->
                            {#if $appStateStore.selectedApp === "WPAY"}
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
                                            {#each SERVICE_OPTIONS as service}
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
                                                    {#if param.service}
                                                        <span
                                                            class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                                                            >{param.service}</span
                                                        >
                                                    {:else}
                                                        -
                                                    {/if}
                                                </td>
                                                <td
                                                    class="px-6 py-4 font-medium text-slate-700 dark:text-slate-300"
                                                    >{param.key}</td
                                                >
                                                <td
                                                    class="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs"
                                                    >{param.value}</td
                                                >
                                                <td
                                                    class="px-6 py-4 text-right"
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
                                                (selectedOptionService = "")}
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
                                    {#if paramOption.application?.toUpperCase() === "WPAY"}
                                        <div class="w-full md:w-1/3">
                                            <label
                                                class="flex flex-col gap-1 w-full"
                                            >
                                                <span
                                                    class="text-xs font-semibold text-slate-500 uppercase"
                                                    >Service</span
                                                >
                                                <select
                                                    class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
                                                    bind:value={
                                                        selectedOptionService
                                                    }
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                        selected
                                                        >Select Service</option
                                                    >
                                                    <option value="WPAY"
                                                        >All</option
                                                    >
                                                    {#each SERVICE_OPTIONS as service}
                                                        <option value={service}
                                                            >{service}</option
                                                        >
                                                    {/each}
                                                </select>
                                            </label>
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
                                                    class="ml-1 hover:text-red-500 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
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
                                                            // Adjust index if deleting an item before current edit
                                                            editingOptionIndex--;
                                                        }
                                                        currentOptions =
                                                            currentOptions.filter(
                                                                (_, idx) =>
                                                                    idx !== i,
                                                            );
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
                                                class="flex gap-2 items-center"
                                            >
                                                <span
                                                    class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                    >{opt.application}</span
                                                >
                                                {#if opt.service}
                                                    <span
                                                        class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400"
                                                        >{opt.service}</span
                                                    >
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
                                                (selectedMidService = "")}
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
                                            <label
                                                class="flex flex-col gap-1 w-full"
                                            >
                                                <span
                                                    class="text-xs font-semibold text-slate-500 uppercase"
                                                    >Service</span
                                                >
                                                <select
                                                    class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
                                                    bind:value={
                                                        selectedMidService
                                                    }
                                                >
                                                    <option
                                                        value=""
                                                        disabled
                                                        selected
                                                        >Select Service</option
                                                    >
                                                    <option value="WPAY"
                                                        >All</option
                                                    >
                                                    {#each SERVICE_OPTIONS as service}
                                                        <option value={service}
                                                            >{service}</option
                                                        >
                                                    {/each}
                                                </select>
                                            </label>
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
                                                        {#if ctx.service}
                                                            <span
                                                                class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px] text-slate-500 dark:text-slate-400"
                                                                >{ctx.service}</span
                                                            >
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
