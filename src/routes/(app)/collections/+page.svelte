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
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import ApiCollectionForm from "./ApiCollectionForm.svelte";
    import { get } from "svelte/store";
    import { collectionExecutionService } from "$lib/features/execution/services/collectionExecutionService";

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

    // Filtered collections based on app and search
    let filteredCollections = $derived.by(() => {
        let list = $settingsStore.apiCollections || [];
        const headerApp = $appStateStore.selectedApp;

        // 1. App Filter (from Header)
        if (headerApp && headerApp !== "All") {
            list = list.filter((c) => c.application === headerApp);
        }

        // 2. Text Search
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
        goto("/collections/new");
    }

    function handleEditCollection(id: string) {
        goto(`/collections/${id}`);
    }

    function handleDelete(id: string) {
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

    <div class="mb-6">
        {#if !$appStateStore.isPageLocked}
            <button
                onclick={handleNewCollection}
                class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all shrink-0"
            >
                <span class="material-symbols-outlined text-[18px]">add</span>
                <span>New Collection</span>
            </button>
        {/if}

        <div class="flex items-end justify-between gap-4 mb-4 md:mb-6">
            <div>
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

            <!-- Desktop Buttons -->
            <div class="hidden md:flex items-center gap-2 transition-all">
                {#if !$appStateStore.isPageLocked}
                    <button
                        onclick={handleNewCollection}
                        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all shrink-0"
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >add</span
                        >
                        <span>New Collection</span>
                    </button>
                {/if}
            </div>
        </div>

        <!-- Mobile Buttons -->
        <div class="flex md:hidden items-center gap-2 mb-4">
            {#if !$appStateStore.isPageLocked}
                <button
                    onclick={handleNewCollection}
                    class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
                >
                    <span class="material-symbols-outlined text-[20px]"
                        >add</span
                    >
                    <span>New Collection</span>
                </button>
            {/if}
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
                        <span
                            class="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        >
                            {col.application}
                        </span>

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
