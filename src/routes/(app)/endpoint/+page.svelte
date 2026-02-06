<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { endpointService } from "$lib/features/endpoints/services/endpointService";
    import type { Endpoint } from "$lib/types/endpoint";
    import { driveService } from "$lib/features/drive/services/driveService";
    import {
        authStore,
        loginWithGoogle,
        checkDriveConnection,
    } from "$lib/features/auth/services/authService";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import EndpointExecutionModal from "$lib/components/endpoint/EndpointExecutionModal.svelte";
    import { get } from "svelte/store";

    import { settingsStore } from "$lib/stores/settingsStore";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { executionService } from "$lib/features/execution/services/executionService";

    let endpoints = $state<Endpoint[]>([]);
    let searchTerm = $state("");
    let filterApp = $state("");

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

        // Initialize search term and app filter from URL query parameter
        const queryTerm = $page.url.searchParams.get("q");
        if (queryTerm) {
            searchTerm = queryTerm;
        }

        const appParam = $page.url.searchParams.get("app");
        if (appParam) {
            filterApp = appParam;
        }

        isReadOnly = $page.url.searchParams.get("readonly") === "true";
    });

    // React to URL changes if the user searches again while on this page
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

            if (appParam !== null && appParam !== filterApp) {
                filterApp = appParam;
            } else if (
                appParam === null &&
                filterApp !== "" &&
                filterApp !== "All"
            ) {
                filterApp = "All";
            }

            if (readonlyParam === "true" && !isReadOnly) {
                isReadOnly = true;
            } else if (readonlyParam !== "true" && isReadOnly) {
                isReadOnly = false;
            }
        });
    });

    let filteredEndpoints = $derived(
        endpoints.filter((endpoint) => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                endpoint.name.toLowerCase().includes(term) ||
                endpoint.uri.toLowerCase().includes(term) ||
                endpoint.method.toLowerCase().includes(term);

            const matchesApp =
                !filterApp ||
                filterApp === "All" ||
                endpoint.application === filterApp;

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
                matchesCategory &&
                matchesCollection
            );
        }),
    );

    let groupedEndpoints = $derived.by(() => {
        // Case-insensitive check for wpay
        if (filterApp.toLowerCase() !== "wpay") return null;

        const groups: Record<string, Endpoint[]> = {};
        filteredEndpoints.forEach((endpoint) => {
            const service = endpoint.scope?.service || "Other";
            if (!groups[service]) {
                groups[service] = [];
            }
            groups[service].push(endpoint);
        });

        // Optional: specific order or alphabetical sort for keys
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    });

    // Collapse/Expand State
    let collapsedServices = $state(new Set<string>());

    function toggleGroup(service: string) {
        // Create a new Set to trigger reactivity (Svelte 5 best practice for Sets/Maps in state if not using deep reactivity for them specifically,
        // though $state with Set usually requires reassignment or using specific methods if wrapped.
        // Reassignment is safest for simple Set usage in derived/effects if needed, but here it's direct rendering.)
        // Actually, for $state proxies, Set methods mutate nicely. But to be safe and explicit:
        const newSet = new Set(collapsedServices);
        if (newSet.has(service)) {
            newSet.delete(service);
        } else {
            newSet.add(service);
        }
        collapsedServices = newSet;
    }

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

    let syncState = $state<"idle" | "backup" | "restore">("idle");

    async function handleDriveBackup() {
        if (syncState !== "idle") return;

        let token = $authStore.accessToken;

        // If not logged in or no token, try login first
        if (!token) {
            try {
                const result = await loginWithGoogle();
                token = result.token;
            } catch (error) {
                showAlert("Sync Error", "Google Login failed.");
                return;
            }
        }

        if (!token) return;

        try {
            syncState = "backup";
            // 1. Backup Endpoints
            const dataToSave = endpointService.getEndpoints();
            await driveService.saveEndpoints(token, dataToSave);

            // 2. Backup Execution History (Presets)
            const historyToSave = executionService.getAllHistory();
            await driveService.saveExecutionHistory(token, historyToSave);

            showAlert(
                "Success",
                "Backup successful! (Endpoints and Presets saved)",
            );
        } catch (error: any) {
            console.error(error);
            if (
                error.message.includes("[401]") ||
                error.message.includes("401")
            ) {
                showAlert(
                    "Authentication Expired",
                    "Google Drive session has expired. Would you like to reconnect and retry?",
                    "confirm",
                    async () => {
                        try {
                            const result = await loginWithGoogle();
                            if (result.token) {
                                syncState = "backup";
                                const dataToSave =
                                    endpointService.getEndpoints();
                                await driveService.saveEndpoints(
                                    result.token,
                                    dataToSave,
                                );
                                showAlert("Success", "Backup successful!");
                            }
                        } catch (retryError) {
                            console.error("Retry failed:", retryError);
                            showAlert(
                                "Error",
                                "Retry failed. Please try again later.",
                            );
                        } finally {
                            syncState = "idle";
                        }
                    },
                );
                return;
            }
            showAlert("Error", `Backup failed: ${error.message}`);
        } finally {
            syncState = "idle";
        }
    }

    async function handleDriveRestore() {
        if (syncState !== "idle") return;

        showAlert(
            "Restore Endpoints",
            "This will overwrite your current local endpoints. Continue?",
            "confirm",
            async () => {
                let token = $authStore.accessToken;
                if (!token) {
                    try {
                        const result = await loginWithGoogle();
                        token = result.token;
                    } catch (error) {
                        showAlert("Sync Error", "Google Login failed.");
                        return;
                    }
                }
                if (!token) return;

                try {
                    syncState = "restore";
                    const data = await driveService.loadEndpoints(token);
                    if (data) {
                        endpointService.importEndpoints(data);

                        // Also restore Execution History (Presets)
                        const historyData =
                            await driveService.loadExecutionHistory(token);
                        if (historyData) {
                            executionService.importHistory(historyData);
                        }

                        endpoints = endpointService.getEndpoints();
                        showAlert(
                            "Success",
                            "Restore successful! (Endpoints and Presets restored)",
                        );
                    } else {
                        showAlert("Info", "No backup found.");
                    }
                } catch (error: any) {
                    console.error(error);
                    if (
                        error.message.includes("[401]") ||
                        error.message.includes("401")
                    ) {
                        showAlert(
                            "Authentication Expired",
                            "Google Drive session has expired. Would you like to reconnect and retry?",
                            "confirm",
                            async () => {
                                try {
                                    const result = await loginWithGoogle();
                                    if (result.token) {
                                        syncState = "restore";
                                        const data =
                                            await driveService.loadEndpoints(
                                                result.token,
                                            );
                                        if (data) {
                                            endpointService.importEndpoints(
                                                data,
                                            );
                                            endpoints =
                                                endpointService.getEndpoints();
                                            showAlert(
                                                "Success",
                                                "Restore successful!",
                                            );
                                        }
                                    }
                                } catch (retryError) {
                                    console.error("Retry failed:", retryError);
                                    showAlert("Error", "Retry failed.");
                                } finally {
                                    syncState = "idle";
                                }
                            },
                        );
                        return;
                    }
                    showAlert("Error", `Restore failed: ${error.message}`);
                } finally {
                    syncState = "idle";
                }
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
        {#snippet syncButtons()}
            {#if !isReadOnly}
                <button
                    onclick={handleDriveBackup}
                    disabled={syncState !== "idle" ||
                        $appStateStore.isPageLocked}
                    class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 disabled:opacity-50 min-w-[90px] justify-center shadow-sm transition-colors"
                >
                    {#if syncState === "backup"}
                        <span
                            class="material-symbols-outlined text-[18px] animate-spin"
                            >sync</span
                        >
                        <span>Wait...</span>
                    {:else}
                        <span class="material-symbols-outlined text-[18px]"
                            >cloud_upload</span
                        >
                        <span>Backup</span>
                    {/if}
                </button>
                <button
                    onclick={handleDriveRestore}
                    disabled={syncState !== "idle" ||
                        $appStateStore.isPageLocked}
                    class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 disabled:opacity-50 min-w-[90px] justify-center shadow-sm transition-colors"
                >
                    {#if syncState === "restore"}
                        <span
                            class="material-symbols-outlined text-[18px] animate-spin"
                            >sync</span
                        >
                        <span>Wait...</span>
                    {:else}
                        <span class="material-symbols-outlined text-[18px]"
                            >cloud_download</span
                        >
                        <span>Restore</span>
                    {/if}
                </button>
            {/if}
        {/snippet}

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
                    {@render syncButtons()}
                </div>
            </div>

            <!-- Mobile Buttons -->
            <div class="flex md:hidden items-center gap-2">
                {@render syncButtons()}
            </div>
        </div>
    </div>

    <!-- Search Input (Dashboard Style - Mobile Only: Hidden on md+ screens) -->
    <div class="mb-6 md:hidden">
        <label class="flex flex-col w-full h-11">
            <div
                class="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-200 dark:border-slate-700 focus-within:border-primary/50 transition-colors bg-white dark:bg-slate-800"
            >
                <div
                    class="text-slate-400 dark:text-[#92adc9] flex items-center justify-center pl-3"
                >
                    <span class="material-symbols-outlined text-[20px]"
                        >search</span
                    >
                </div>
                <input
                    class="flex w-full min-w-0 flex-1 resize-none overflow-hidden bg-transparent rounded-r-lg text-slate-900 dark:text-white focus:outline-0 placeholder:text-slate-400 dark:placeholder:text-[#5a718a] placeholder:text-xs px-2 text-sm"
                    placeholder="Search endpoints by name."
                    bind:value={searchTerm}
                />
            </div>
        </label>
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
    {:else if groupedEndpoints}
        <div class="space-y-12">
            {#each groupedEndpoints as [service, groupEndpoints]}
                <section>
                    <button
                        onclick={() => toggleGroup(service)}
                        class="w-full flex items-center gap-3 mb-4 group focus:outline-none"
                    >
                        <div
                            class="h-px bg-slate-200 dark:bg-border-dark flex-1 transition-colors group-hover:bg-slate-300 dark:group-hover:bg-slate-600"
                        ></div>
                        <h2
                            class="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2"
                        >
                            {service}
                            <span
                                class="material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-200 {collapsedServices.has(
                                    service,
                                )
                                    ? '-rotate-90'
                                    : 'rotate-0'}"
                            >
                                expand_more
                            </span>
                        </h2>
                        <span
                            class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-background-dark text-xs font-semibold text-slate-500"
                        >
                            {groupEndpoints.length}
                        </span>
                        <div
                            class="h-px bg-slate-200 dark:bg-border-dark flex-1 transition-colors group-hover:bg-slate-300 dark:group-hover:bg-slate-600"
                        ></div>
                    </button>

                    {#if !collapsedServices.has(service)}
                        <div
                            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {#each groupEndpoints as endpoint}
                                <div
                                    class="group bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:shadow-md transition-shadow relative"
                                >
                                    <div
                                        class="flex items-start justify-between mb-3"
                                    >
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
                                                    openExecutionModal(
                                                        endpoint,
                                                    );
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
                                                    onclick={() =>
                                                        handleDelete(
                                                            endpoint.id,
                                                        )}
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
                                                    >{endpoint.scope
                                                        ?.service}</span
                                                >
                                            </div>
                                            <div class="flex flex-col">
                                                <span
                                                    class="text-[10px] uppercase tracking-wider text-slate-400"
                                                    >Site</span
                                                >
                                                <span
                                                    class="font-medium text-slate-700 dark:text-slate-300"
                                                    >{endpoint.scope
                                                        ?.site}</span
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
                </section>
            {/each}
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
                            <!--
                            <button
                                onclick={() => goto(`/endpoint/${endpoint.id}`)}
                                class="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                            >
                                <span class="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            -->
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
