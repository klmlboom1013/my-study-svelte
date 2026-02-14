<script lang="ts">
    import { settingsStore } from "$lib/stores/settingsStore";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import { driveService } from "$lib/features/drive/services/driveService";
    import {
        authStore,
        loginWithGoogle,
    } from "$lib/features/auth/services/authService";
    import { ensureDriveConnected } from "$lib/utils/driveGuard";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import ApiCollectionForm from "./ApiCollectionForm.svelte";
    import { get } from "svelte/store";
    import { collectionExecutionService } from "$lib/features/execution/services/collectionExecutionService";

    import { profileStore } from "$lib/stores/profileStore";
    import SelectBox from "$lib/components/ui/SelectBox.svelte";
    import { fade } from "svelte/transition";

    // Alert Modal State
    let isAlertOpen = $state(false);
    let alertTitle = $state("");
    let alertMessage = $state("");
    let alertType = $state<"alert" | "confirm">("alert");
    let onAlertConfirm = $state<(() => void) | undefined>(undefined);
    let onAlertCancel = $state<(() => void) | undefined>(undefined);

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

    // State management for filtering
    let searchQuery = $state("");

    // Local filter states (synced with appStateStore for global persistence)
    let selectedApp = $derived($appStateStore.selectedApp);
    let selectedService = $state("All");
    let selectedSite = $state("All");

    // Initialize local filters from store when app changes
    $effect(() => {
        // When selectedApp changes (globally), we might want to reset local filters
        // But appStateStore already has selectedService/Site.
        // Let's sync them.
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

    // Derived list of applications
    let applications = $derived.by(() => {
        const apps =
            $settingsStore.applications?.map((app) => app.appName) || [];
        return ["All", ...Array.from(new Set(apps)).filter(Boolean)];
    });

    function handleSiteChange(val: string) {
        appStateStore.update((s) => ({
            ...s,
            selectedSite: val,
        }));
    }

    // Derived data for filters (Source of truth: settingsStore.applications)
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

        // Find service by name to get its potentially different ID/reference
        const serviceObj = currentAppData.services?.find(
            (s) => s.name === selectedService,
        );

        // Try to match by service name OR ID (to fix the blank dropdown bug)
        const context = currentAppData.siteContexts.find(
            (c) =>
                c.service === selectedService ||
                (serviceObj && c.service === serviceObj.id),
        );

        return context ? ["All", ...context.sites] : ["All"];
    });

    // Filtered collections based on app and search
    let filteredCollections = $derived.by(() => {
        let list = $settingsStore.apiCollections || [];
        // Use local states which are synced with store
        const qApp = selectedApp;
        const qSvc = selectedService;
        const qSite = selectedSite;

        // 1. App Filter
        if (qApp && qApp !== "All") {
            list = list.filter((c) => c.application === qApp);
        }

        // 2. Service Filter
        if (qSvc && qSvc !== "All") {
            list = list.filter((c) => c.service?.includes(qSvc));
        }

        // 3. Site Filter
        if (qSite && qSite !== "All") {
            list = list.filter((c) => c.site?.includes(qSite));
        }

        // 4. Text Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    c.description.toLowerCase().includes(q),
            );
        }
        return list;
    });

    function handleNewCollection() {
        if (!ensureDriveConnected()) return;
        goto("/collections/new");
    }

    function handleEditCollection(id: string) {
        if (!ensureDriveConnected()) return;
        goto(`/collections/${id}`);
    }

    function handleDelete(id: string) {
        if (!ensureDriveConnected()) return;
        showAlert(
            "Delete Collection",
            "Are you sure you want to delete this collection?",
            "confirm",
            () => {
                settingsStore.removeApiCollection(id);
                showAlert("Success", "Collection deleted successfully!");
            },
        );
    }

    function handleDuplicate(col: any) {
        if (!ensureDriveConnected()) return;
        // Create a deep copy using JSON parse/stringify for simplicity with POJOs
        const newCol = JSON.parse(JSON.stringify(col));

        // Generate new IDs
        newCol.id = crypto.randomUUID();
        newCol.name = `${newCol.name} - 복사본`;
        newCol.isBookmarked = false; // Reset bookmark for copy

        if (newCol.steps) {
            newCol.steps.forEach((step: any) => {
                step.id = crypto.randomUUID();
            });
        }

        settingsStore.addApiCollection(newCol);
        showAlert("Success", "Collection duplicated successfully!");
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

<div class="max-w-7xl mx-auto py-8 px-6">
    <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "API Collections" }]}
    />

    <div class="mb-10">
        <div
            class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
        >
            <div class="flex-1">
                <h1
                    class="text-3xl font-bold text-slate-900 dark:text-white mb-2"
                >
                    API Collections
                </h1>
                <p class="text-slate-500 dark:text-slate-400">
                    Organize and execute endpoints sequentially according to
                    business flows.
                </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-3">
                {#if !$appStateStore.isPageLocked}
                    <button
                        onclick={handleNewCollection}
                        class="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-all hover:-translate-y-0.5"
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >add</span
                        >
                        <span>New Collection</span>
                    </button>
                {/if}
            </div>
        </div>

        <!-- Filter Area -->
        <div
            class="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800"
        >
            <div class="flex flex-wrap items-center gap-4">
                <!-- App Selection -->
                <div class="w-full sm:w-44">
                    <SelectBox
                        id="collection-app-select"
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
                            bind:value={searchQuery}
                            placeholder="Collection name or description..."
                            class="w-full bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>

                <!-- Service Dropdown -->
                {#if services.length > 1}
                    <div
                        class="w-full sm:w-44"
                        transition:fade={{ duration: 150 }}
                    >
                        <SelectBox
                            id="collection-service-select"
                            placeholder="All Services"
                            options={services}
                            value={selectedService}
                            onchange={handleServiceChange}
                        />
                    </div>
                {/if}

                <!-- Site Dropdown -->
                {#if sites.length > 1}
                    <div
                        class="w-full sm:w-44"
                        transition:fade={{ duration: 150 }}
                    >
                        <SelectBox
                            id="collection-site-select"
                            placeholder="All Sites"
                            options={sites}
                            value={selectedSite}
                            onchange={handleSiteChange}
                        />
                    </div>
                {/if}

                <div
                    class="bg-slate-200 dark:bg-slate-700 h-8 w-[1px] hidden lg:block mx-1"
                ></div>

                <div
                    class="text-xs font-medium text-slate-400 uppercase tracking-wider pl-1"
                >
                    {filteredCollections.length} Results
                </div>
            </div>
        </div>
    </div>

    <!-- Collections Grid -->
    {#if filteredCollections.length === 0}
        <div
            class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center"
        >
            <div
                class="inline-flex size-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4"
            >
                <span
                    class="material-symbols-outlined text-[32px] text-slate-400"
                    >folder_open</span
                >
            </div>
            <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No collections found
            </h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6">
                Get started by creating your first API collection.
            </p>
            <button
                onclick={handleNewCollection}
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
            >
                <span class="material-symbols-outlined text-[18px]">add</span>
                <span>Create Collection</span>
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredCollections as col}
                <div
                    class="group bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:shadow-md transition-shadow relative flex flex-col h-full"
                >
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex flex-wrap gap-1">
                            <span
                                class="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            >
                                {col.application}
                            </span>
                            {#if col.service && col.service.length > 0}
                                {#each col.service as svc}
                                    <span
                                        class="px-2 py-1 rounded text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    >
                                        {svc}
                                    </span>
                                {/each}
                            {/if}
                            {#if col.site && col.site.length > 0}
                                {#each col.site as site}
                                    <span
                                        class="px-2 py-1 rounded text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                    >
                                        {site}
                                    </span>
                                {/each}
                            {/if}
                        </div>

                        <div
                            class="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1"
                        >
                            <button
                                onclick={() =>
                                    goto(`/collections/run/${col.id}`)}
                                class="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-500/10 rounded-md transition-colors"
                                title="Run Collection"
                            >
                                <span
                                    class="material-symbols-outlined text-[18px]"
                                    >play_arrow</span
                                >
                            </button>
                            {#if !$appStateStore.isPageLocked}
                                <button
                                    onclick={() => handleDuplicate(col)}
                                    class="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                                    title="Duplicate"
                                >
                                    <span
                                        class="material-symbols-outlined text-[18px]"
                                        >content_copy</span
                                    >
                                </button>
                                <button
                                    onclick={() => handleEditCollection(col.id)}
                                    class="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                    title="Edit"
                                >
                                    <span
                                        class="material-symbols-outlined text-[18px]"
                                        >edit</span
                                    >
                                </button>
                                <button
                                    class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                                    title="Delete"
                                    onclick={() => handleDelete(col.id)}
                                >
                                    <span
                                        class="material-symbols-outlined text-[18px]"
                                        >delete</span
                                    >
                                </button>
                            {/if}
                        </div>
                    </div>

                    <div class="flex items-center gap-3 mb-3">
                        <div
                            class="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0"
                            style={col.color
                                ? `background-color: ${col.color}20`
                                : ""}
                        >
                            <span
                                class="material-symbols-outlined text-[20px]"
                                style={col.color ? `color: ${col.color}` : ""}
                            >
                                {col.icon || "folder"}
                            </span>
                        </div>
                        <button
                            onclick={() => goto(`/collections/run/${col.id}`)}
                            class="block min-w-0 flex-1 group/link text-left appearance-none bg-transparent border-none p-0"
                        >
                            <h3
                                class="text-lg font-semibold text-slate-900 dark:text-white group-hover/link:text-primary transition-colors truncate"
                            >
                                {col.name}
                            </h3>
                        </button>
                    </div>

                    <p
                        class="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 flex-grow"
                    >
                        {col.description || "No description provided."}
                    </p>

                    <div
                        class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-border-dark/50 mt-auto"
                    >
                        <div class="flex flex-wrap gap-1">
                            <span class="text-xs font-medium text-slate-400">
                                {col.steps?.length || 0} steps
                            </span>
                        </div>

                        <button
                            onclick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                settingsStore.toggleApiCollectionBookmark(
                                    col.id,
                                );
                            }}
                            class="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                            title={col.isBookmarked
                                ? "Remove from bookmarks"
                                : "Add to bookmarks"}
                        >
                            <span
                                class="material-symbols-outlined text-[20px] transition-colors {col.isBookmarked
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
