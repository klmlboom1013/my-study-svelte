<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { endpointService } from "$lib/features/endpoints/services/endpointService";
    import type { Endpoint } from "$lib/types/endpoint";
    import {
        authStore,
        loginWithGoogle,
        checkDriveConnection,
    } from "$lib/features/auth/services/authService";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import EndpointExecutionModal from "$lib/components/endpoint/EndpointExecutionModal.svelte";
    import SelectBox from "$lib/components/ui/SelectBox.svelte";
    import { get } from "svelte/store";

    import { settingsStore } from "$lib/stores/settingsStore";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { executionService } from "$lib/features/execution/services/executionService";

    let endpoints = $state<Endpoint[]>([]);
    let searchTerm = $state("");

    let breadcrumbItems = $derived.by(() => {
        const categoryId = $page.url.searchParams.get("category");
        if (categoryId) {
            const category = $settingsStore.apiCategories.find(
                (c) => c.id === categoryId,
            );
            if (category) {
                return [
                    { label: "Home", href: "/" },
                    { label: "API Categories", href: "/categories" },
                    { label: `Test Endpoint (${category.name})` },
                ];
            }
        }

        const collectionId = $page.url.searchParams.get("collection");
        if (collectionId) {
            const collection = $settingsStore.apiCollections.find(
                (c) => c.id === collectionId,
            );
            if (collection) {
                return [
                    { label: "Home", href: "/" },
                    { label: "API Collections", href: "/collections" },
                    { label: `Test Endpoint (${collection.name})` },
                ];
            }
        }
        return [{ label: "Home", href: "/" }, { label: "Test Endpoint" }];
    });

    onMount(() => {
        endpoints = endpointService.getEndpoints();

        // Initialize search term from URL query parameter
        const queryTerm = $page.url.searchParams.get("q");
        if (queryTerm) {
            searchTerm = queryTerm;
        }

        isReadOnly = $page.url.searchParams.get("readonly") === "true";
    });

    // React to URL changes
    $effect(() => {
        const queryTerm = $page.url.searchParams.get("q");
        const appParam = $page.url.searchParams.get("app");
        const readonlyParam = $page.url.searchParams.get("readonly");

        untrack(() => {
            if (queryTerm !== null && queryTerm !== searchTerm) {
                searchTerm = queryTerm;
            } else if (queryTerm === null && searchTerm !== "") {
                searchTerm = "";
            }

            if (appParam !== null && appParam !== $appStateStore.selectedApp) {
                handleAppChange(appParam);
            }

            if (readonlyParam === "true" && !isReadOnly) {
                isReadOnly = true;
            } else if (readonlyParam !== "true" && isReadOnly) {
                isReadOnly = false;
            }
        });
    });

    // Alert Modal State
    let isAlertOpen = $state(false);
    let alertTitle = $state("");
    let alertMessage = $state("");
    let alertType = $state<"alert" | "confirm">("alert");
    let onAlertConfirm = $state<(() => void) | undefined>(undefined);
    let onAlertCancel = $state<(() => void) | undefined>(undefined);

    // Execution Modal State
    let isExecutionModalOpen = $state(false);
    let selectedEndpoint = $state<Endpoint | null>(null);

    function openExecutionModal(endpoint: Endpoint) {
        if (!checkDriveConnection()) {
            showAlert(
                "Google Drive Connection Required",
                "Google Drive is not connected. Please connect your Google account to enable executing endpoints and ensure your results are backed up.",
                "confirm",
                handleGoogleLogin,
            );
            return;
        }
        selectedEndpoint = endpoint;
        isExecutionModalOpen = true;
    }

    async function handleGoogleLogin() {
        try {
            await loginWithGoogle();
        } catch (e) {
            console.error("Login failed", e);
        }
    }

    function handleNewEndpoint() {
        if (checkDriveConnection()) {
            goto("/endpoint/new");
        } else {
            showAlert(
                "Google Drive Connection Required",
                "Google Drive is not connected. Please connect your Google account to enable creating new endpoints and ensure your data is backed up.",
                "confirm",
                handleGoogleLogin,
            );
        }
    }

    function showAlert(
        title: string,
        message: string,
        type: "alert" | "confirm" = "alert",
        onConfirm?: () => void,
        onCancel?: () => void,
    ) {
        alertTitle = title;
        alertMessage = message;
        alertType = type;
        onAlertConfirm = onConfirm;
        onAlertCancel = onCancel;
        isAlertOpen = true;
    }

    let isReadOnly = $state(false);

    // Filter states (synced with appStateStore for global persistence)
    let selectedApp = $derived($appStateStore.selectedApp);
    let selectedService = $state("All");
    let selectedSite = $state("All");

    // Sync local filters when appStateStore changes
    $effect(() => {
        // We only want to pull Service/Site if they are still valid for the current app
        // But for simplicity, we directly sync.
        selectedService = $appStateStore.selectedService || "All";
        selectedSite = $appStateStore.selectedSite || "All";
    });

    function handleAppChange(val: string) {
        appStateStore.update((s) => ({
            ...s,
            selectedApp: val,
            selectedService: "All",
            selectedSite: "All",
        }));
    }

    function handleServiceChange(val: string) {
        appStateStore.update((s) => ({
            ...s,
            selectedService: val,
            selectedSite: "All",
        }));
    }

    function handleSiteChange(val: string) {
        appStateStore.update((s) => ({
            ...s,
            selectedSite: val,
        }));
    }

    // Derived data for filters (Source of truth: settingsStore.applications)
    let applications = $derived.by(() => {
        const apps =
            $settingsStore.applications?.map((app) => app.appName) || [];
        return ["All", ...Array.from(new Set(apps)).filter(Boolean)];
    });

    let currentAppData = $derived(
        $settingsStore.applications?.find((app) => app.appName === selectedApp),
    );

    let services = $derived.by(() => {
        if (!currentAppData?.services) return ["All"];
        return ["All", ...currentAppData.services.map((s) => s.name)];
    });

    let sites = $derived.by(() => {
        if (
            !selectedService ||
            selectedService === "All" ||
            !currentAppData?.siteContexts
        )
            return ["All"];

        // Match by service name or ID
        const serviceObj = currentAppData.services?.find(
            (s) => s.name === selectedService,
        );
        const context = currentAppData.siteContexts.find(
            (c) =>
                c.service === selectedService ||
                (serviceObj && c.service === serviceObj.id),
        );

        return context ? ["All", ...context.sites] : ["All"];
    });

    let filteredEndpoints = $derived(
        endpoints.filter((endpoint) => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                endpoint.name.toLowerCase().includes(term) ||
                endpoint.uri.toLowerCase().includes(term) ||
                endpoint.method.toLowerCase().includes(term);

            const matchesApp =
                !selectedApp ||
                selectedApp === "All" ||
                endpoint.application === selectedApp;

            const qSvc = selectedService;
            const qSite = selectedSite;

            const matchesService =
                !qSvc || qSvc === "All" || endpoint.scope?.service === qSvc;

            const matchesSite =
                !qSite || qSite === "All" || endpoint.scope?.site === qSite;

            // Check for category filter from URL
            const categoryId = $page.url.searchParams.get("category");
            const matchesCategory =
                !categoryId || endpoint.categoryId === categoryId;

            // Check for collection filter from URL
            const collectionId = $page.url.searchParams.get("collection");
            const matchesCollection =
                !collectionId ||
                (endpoint.collectionIds || []).includes(collectionId);

            return (
                matchesSearch &&
                matchesApp &&
                matchesService &&
                matchesSite &&
                matchesCategory &&
                matchesCollection
            );
        }),
    );

    function handleDelete(id: string) {
        if (!checkDriveConnection()) {
            showAlert(
                "Google Drive Connection Required",
                "Google Drive is not connected. Please connect your Google account to enable deleting endpoints and ensure your sync is up to date.",
                "confirm",
                handleGoogleLogin,
            );
            return;
        }
        showAlert(
            "Delete Endpoint",
            "Are you sure you want to delete this endpoint?",
            "confirm",
            () => {
                endpointService.deleteEndpoint(id);
                endpoints = endpointService.getEndpoints();
            },
        );
    }
</script>

<AlertModal
    bind:isOpen={isAlertOpen}
    title={alertTitle}
    message={alertMessage}
    type={alertType}
    onConfirm={onAlertConfirm}
    onCancel={onAlertCancel}
/>

<EndpointExecutionModal
    bind:isOpen={isExecutionModalOpen}
    bind:endpoint={selectedEndpoint}
/>

<div class="max-w-7xl mx-auto py-8 px-6">
    <Breadcrumbs items={breadcrumbItems} />
    <div class="mb-6">
        <div class="mb-6">
            <div class="flex items-end justify-between gap-4 mb-4 md:mb-6">
                <div>
                    <h1
                        class="text-3xl font-bold text-slate-900 dark:text-white mb-2"
                    >
                        Endpoints
                    </h1>
                    <p class="text-slate-500 dark:text-slate-400">
                        Manage your API endpoints and configurations.
                    </p>
                </div>

                <!-- Desktop Buttons -->
                <div class="hidden md:flex items-center gap-2">
                    {#if !isReadOnly && !$appStateStore.isPageLocked}
                        <button
                            onclick={handleNewEndpoint}
                            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all shrink-0"
                        >
                            <span class="material-symbols-outlined text-[20px]"
                                >add</span
                            >
                            <span>New Endpoint</span>
                        </button>
                    {/if}
                </div>
            </div>

            <!-- Integrated Filter Area -->
            <div
                class="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800"
            >
                <div class="flex flex-wrap items-center gap-4">
                    <!-- App Selection -->
                    <div class="w-full sm:w-44">
                        <SelectBox
                            id="endpoint-app-select"
                            placeholder="All Applications"
                            options={applications}
                            value={selectedApp}
                            onchange={handleAppChange}
                        />
                    </div>

                    <!-- Search Box -->
                    <div class="flex-1 min-w-[200px]">
                        <div class="relative group">
                            <span
                                class="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-slate-400 group-focus-within:text-primary transition-colors"
                            >
                                search
                            </span>
                            <input
                                type="text"
                                bind:value={searchTerm}
                                placeholder="Search endpoints..."
                                class="w-full h-10 pl-11 pr-4 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    <!-- Service Dropdown (Conditional) -->
                    {#if services.length > 1}
                        <div class="w-full sm:w-44">
                            <SelectBox
                                placeholder="All Services"
                                options={services}
                                value={selectedService}
                                onchange={handleServiceChange}
                            />
                        </div>
                    {/if}

                    <!-- Site Dropdown (Conditional) -->
                    {#if sites.length > 1}
                        <div class="w-full sm:w-44">
                            <SelectBox
                                placeholder="All Sites"
                                options={sites}
                                value={selectedSite}
                                onchange={handleSiteChange}
                            />
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>

    {#if filteredEndpoints.length === 0}
        <div
            class="flex flex-col items-center justify-center p-12 bg-white dark:bg-card-dark rounded-xl border border-dashed border-slate-300 dark:border-border-dark"
        >
            <div
                class="size-16 bg-slate-100 dark:bg-background-dark rounded-full flex items-center justify-center mb-4"
            >
                <span class="material-symbols-outlined text-slate-400 text-3xl"
                    >api</span
                >
            </div>
            <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-1">
                {#if searchTerm}
                    No matching endpoints found
                {:else}
                    No endpoints yet
                {/if}
            </h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6 text-center">
                {#if searchTerm}
                    Try adjusting your search terms.
                {:else}
                    <span class="hidden md:inline"
                        >Create your first endpoint to get started with API
                        testing.</span
                    >
                    <span class="md:hidden"
                        >Endpoint creation is not supported on mobile browsers.</span
                    >
                {/if}
            </p>
            {#if !searchTerm && !isReadOnly}
                <button
                    onclick={handleNewEndpoint}
                    class="text-primary font-medium hover:underline hidden md:inline-block"
                >
                    Create new endpoint
                </button>
            {/if}
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredEndpoints as endpoint}
                <div
                    class="group bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:shadow-md transition-shadow relative"
                >
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <span
                                class="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            >
                                {endpoint.application}
                            </span>
                            <span
                                class="px-2 py-1 rounded text-xs font-bold bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-slate-300"
                            >
                                {endpoint.method}
                            </span>
                            <span
                                class="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-border-dark px-2 py-0.5 rounded-full"
                            >
                                {endpoint.requestType}
                            </span>
                        </div>
                        <div
                            class="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1"
                        >
                            <button
                                onclick={(e) => {
                                    e.stopPropagation();
                                    openExecutionModal(endpoint);
                                }}
                                class="p-1 text-slate-400 hover:text-green-500 transition-colors"
                                title="Execute API"
                            >
                                <span
                                    class="material-symbols-outlined text-[18px]"
                                    >play_arrow</span
                                >
                            </button>
                            {#if !isReadOnly && !$appStateStore.isPageLocked}
                                <button
                                    onclick={() => handleDelete(endpoint.id)}
                                    class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    <span
                                        class="material-symbols-outlined text-[18px]"
                                        >delete</span
                                    >
                                </button>
                            {/if}
                        </div>
                    </div>

                    <a
                        href={`/endpoint/${endpoint.id}`}
                        class="block focus:outline-none"
                    >
                        <h3
                            class="text-lg font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors truncate"
                        >
                            {endpoint.name}
                        </h3>
                    </a>

                    <div
                        class="font-mono text-xs text-slate-500 dark:text-slate-400 mb-4 truncate bg-slate-50 dark:bg-background-dark px-2 py-1 rounded"
                    >
                        {endpoint.uri}
                    </div>

                    <div
                        class="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-border-dark/50"
                    >
                        <div
                            class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400"
                        >
                            <div class="flex flex-col">
                                <span
                                    class="text-[10px] uppercase tracking-wider text-slate-400"
                                    >Service</span
                                >
                                <span
                                    class="font-medium text-slate-700 dark:text-slate-300"
                                    >{endpoint.scope?.service}</span
                                >
                            </div>
                            <div class="flex flex-col">
                                <span
                                    class="text-[10px] uppercase tracking-wider text-slate-400"
                                    >Site</span
                                >
                                <span
                                    class="font-medium text-slate-700 dark:text-slate-300"
                                    >{endpoint.scope?.site}</span
                                >
                            </div>
                        </div>

                        <button
                            onclick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                settingsStore.toggleEndpointBookmark(
                                    endpoint.id,
                                );
                            }}
                            class="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                            title={$settingsStore.interface.starredEndpointIds?.includes(
                                endpoint.id,
                            )
                                ? "Remove from bookmarks"
                                : "Add to bookmarks"}
                        >
                            <span
                                class="material-symbols-outlined text-[20px] transition-colors {$settingsStore.interface.starredEndpointIds?.includes(
                                    endpoint.id,
                                )
                                    ? 'text-yellow-400 fill-current icon-filled'
                                    : 'text-slate-400 hover:text-yellow-400'}"
                            >
                                grade
                            </span>
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .icon-filled {
        font-variation-settings:
            "FILL" 1,
            "wght" 400,
            "GRAD" 0,
            "opsz" 24;
    }
</style>
