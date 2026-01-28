<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { settingsStore } from "$lib/stores/settingsStore";
    import { endpointService } from "$lib/features/endpoints/services/endpointService";
    import type { Endpoint } from "$lib/types/endpoint";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";

    // Get Category ID from params
    const categoryId = $page.params.id;

    // Derived Category Data
    let category = $derived(
        $settingsStore.apiCategories?.find((c) => c.id === categoryId),
    );

    // Endpoint State
    let relevantEndpoints = $state<Endpoint[]>([]);
    let selectedEndpointIds = $state<Set<string>>(new Set());
    let searchTerm = $state("");
    let hideAssignedToOthers = $state(false);

    // Alert State
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

    onMount(() => {
        if (!category) {
            showAlert("Error", "Category not found", "alert", () => {
                goto("/categories");
            });
            return;
        }

        const allEndpoints = endpointService.getEndpoints();
        // Filter endpoints relevant to this category's application
        // If category application is 'All', usually we might show all, but categories are strictly tied to specific apps or general.
        // Assuming strict app binding for now based on previous context.
        // If category.application is "All", maybe show all? But typically categories are specific.
        // Let's stick to matching application.

        relevantEndpoints = allEndpoints.filter(
            (e) => e.application === category?.application,
        );

        // Pre-select endpoints that already have this categoryId
        const initialSelected = relevantEndpoints
            .filter((e) => e.categoryId === categoryId)
            .map((e) => e.id);
        selectedEndpointIds = new Set(initialSelected);
    });

    // Toggle Selection
    function toggleSelection(id: string) {
        const newSet = new Set(selectedEndpointIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        selectedEndpointIds = newSet;
    }

    // Toggle All
    function toggleAll() {
        const allVisibleSelected =
            filteredEndpoints.length > 0 &&
            filteredEndpoints.every((e) => selectedEndpointIds.has(e.id));
        const newSet = new Set(selectedEndpointIds);

        if (allVisibleSelected) {
            filteredEndpoints.forEach((e) => newSet.delete(e.id));
        } else {
            filteredEndpoints.forEach((e) => newSet.add(e.id));
        }
        selectedEndpointIds = newSet;
    }

    // Filter Logic
    let filteredEndpoints = $derived(
        relevantEndpoints.filter((e) => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                e.name.toLowerCase().includes(term) ||
                e.uri.toLowerCase().includes(term) ||
                e.method.toLowerCase().includes(term);

            const matchesHide = hideAssignedToOthers
                ? !(e.categoryId && e.categoryId !== categoryId)
                : true;

            return matchesSearch && matchesHide;
        }),
    );

    // Save Changes
    function handleSave() {
        showAlert(
            "Save Changes",
            "Update endpoint assignments for this category?",
            "confirm",
            async () => {
                try {
                    const updatesRaw = endpointService.getEndpoints();
                    const updatedEndpoints = updatesRaw.map((e) => {
                        // Only touch endpoints of this app
                        if (e.application === category?.application) {
                            if (selectedEndpointIds.has(e.id)) {
                                return { ...e, categoryId: categoryId };
                            } else if (e.categoryId === categoryId) {
                                // Was in this category, now removed.
                                return { ...e, categoryId: undefined };
                            }
                        }
                        return e;
                    });

                    endpointService.importEndpoints(updatedEndpoints);

                    // Refresh local state to show changes immediately
                    const allEndpoints = endpointService.getEndpoints();
                    relevantEndpoints = allEndpoints.filter(
                        (e) => e.application === category?.application,
                    );

                    showAlert(
                        "Success",
                        "Category assignments updated!",
                        "alert",
                        () => {
                            // Navigate back to category list after success
                            goto("/categories");
                        },
                    );
                } catch (e) {
                    console.error(e);
                    showAlert("Error", "Failed to update assignments.");
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

<div class="max-w-screen-xl mx-auto py-8 px-4">
    <Breadcrumbs
        items={[
            { label: "Home", href: "/" },
            { label: "API Categories", href: "/categories" },
            { label: category?.name || "Loading..." },
        ]}
    />

    {#if category}
        <div class="mb-8">
            <div class="flex items-start justify-between">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <div
                            class="size-12 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0"
                            style={category.color
                                ? `background-color: ${category.color}20`
                                : ""}
                        >
                            <span
                                class="material-symbols-outlined text-[24px]"
                                style={category.color
                                    ? `color: ${category.color}`
                                    : ""}
                            >
                                {category.icon || "category"}
                            </span>
                        </div>
                        <h1
                            class="text-3xl font-bold text-slate-900 dark:text-white"
                        >
                            {category.name}
                        </h1>
                    </div>
                    <p class="text-slate-500 dark:text-slate-400 max-w-2xl">
                        {category.description || "No description provided."}
                    </p>
                </div>
                <div class="flex gap-2">
                    <button
                        onclick={handleSave}
                        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >save</span
                        >
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>

        <div
            class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden flex flex-col h-[600px]"
        >
            <div
                class="p-4 border-b border-slate-200 dark:border-border-dark flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50"
            >
                <div>
                    <h2
                        class="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                        manage Endpoints
                    </h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">
                        Select endpoints to include in this category.
                    </p>
                </div>
                <div class="flex items-center gap-4">
                    <label
                        class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium cursor-pointer select-none"
                    >
                        <input
                            type="checkbox"
                            bind:checked={hideAssignedToOthers}
                            class="rounded border-slate-300 text-primary focus:ring-primary shadow-sm"
                        />
                        Hide assigned to others
                    </label>
                    <!-- Search -->
                    <div class="relative w-64">
                        <span
                            class="absolute inset-y-0 left-0 flex items-center pl-3"
                        >
                            <span
                                class="material-symbols-outlined text-slate-400"
                                >search</span
                            >
                        </span>
                        <input
                            type="text"
                            bind:value={searchTerm}
                            placeholder="Search endpoints..."
                            class="w-full pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            <!-- List Header -->
            <div
                class="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-border-dark text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
                <div class="flex items-center">
                    <input
                        type="checkbox"
                        checked={selectedEndpointIds.size ===
                            filteredEndpoints.length &&
                            filteredEndpoints.length > 0}
                        indeterminate={selectedEndpointIds.size > 0 &&
                            selectedEndpointIds.size < filteredEndpoints.length}
                        onclick={toggleAll}
                        class="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                </div>
                <div>Endpoint Name / URI</div>
                <div>Service</div>
                <div>Method</div>
                <div class="text-right">Currently Assigned</div>
            </div>

            <!-- List Body -->
            <div class="overflow-y-auto flex-1 p-2 space-y-1">
                {#if filteredEndpoints.length === 0}
                    <div
                        class="flex flex-col items-center justify-center h-full text-slate-500"
                    >
                        <span
                            class="material-symbols-outlined text-[48px] opacity-20 mb-2"
                            >search_off</span
                        >
                        <p>No endpoints found matching your search.</p>
                    </div>
                {:else}
                    {#each filteredEndpoints as endpoint (endpoint.id)}
                        <label
                            class="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors items-center border border-transparent hover:border-slate-200 dark:hover:border-slate-700 {selectedEndpointIds.has(
                                endpoint.id,
                            )
                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                                : ''}"
                        >
                            <div class="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedEndpointIds.has(
                                        endpoint.id,
                                    )}
                                    onclick={() => toggleSelection(endpoint.id)}
                                    class="rounded border-slate-300 text-primary focus:ring-primary"
                                />
                            </div>
                            <div class="min-w-0">
                                <div
                                    class="font-medium text-slate-900 dark:text-white truncate"
                                >
                                    {endpoint.name}
                                </div>
                                <div
                                    class="text-xs text-slate-500 font-mono truncate"
                                >
                                    {endpoint.uri}
                                </div>
                            </div>
                            <!-- Service Column -->
                            <div
                                class="text-sm text-slate-600 dark:text-slate-300"
                            >
                                {endpoint.scope?.service || "-"}
                            </div>
                            <div>
                                <span
                                    class="px-2 py-0.5 rounded text-xs font-bold
                                    {endpoint.method === 'GET'
                                        ? 'bg-blue-100 text-blue-700'
                                        : endpoint.method === 'POST'
                                          ? 'bg-green-100 text-green-700'
                                          : endpoint.method === 'PUT'
                                            ? 'bg-orange-100 text-orange-700'
                                            : endpoint.method === 'DELETE'
                                              ? 'bg-red-100 text-red-700'
                                              : 'bg-slate-100 text-slate-700'}"
                                >
                                    {endpoint.method}
                                </span>
                            </div>
                            <div class="text-right">
                                {#if endpoint.categoryId === categoryId}
                                    <span
                                        class="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full"
                                    >
                                        <span
                                            class="material-symbols-outlined text-[14px]"
                                            >check</span
                                        >
                                        Assigned
                                    </span>
                                {:else if endpoint.categoryId}
                                    <span
                                        class="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full"
                                        title="Assigned to another category"
                                    >
                                        <span
                                            class="material-symbols-outlined text-[14px]"
                                            >swap_horiz</span
                                        >
                                        Move
                                    </span>
                                {/if}
                            </div>
                        </label>
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
</div>
