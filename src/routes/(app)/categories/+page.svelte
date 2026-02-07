<script lang="ts">
    import { settingsStore } from "$lib/stores/settingsStore";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import {
        authStore,
        loginWithGoogle,
    } from "$lib/features/auth/services/authService";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import ApiCategoryForm from "./ApiCategoryForm.svelte";
    import { get } from "svelte/store";

    // Create Modal State
    let isCreateModalOpen = $state(false);

    // Edit Modal State
    let isEditModalOpen = $state(false);
    let selectedCategory = $state<any>(null);

    // Watch for ?new=true query param
    $effect(() => {
        if ($page.url.searchParams.get("new") === "true") {
            isCreateModalOpen = true;
            // Optionally clear the param to avoid re-opening on manual refresh if desired,
            // but usually SvelteKit filters keep it. Let's just open it.
        }
    });

    function openEditModal(category: any) {
        selectedCategory = category;
        isEditModalOpen = true;
    }

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

    // Filtering logic similar to settings page
    let filteredApiCategories = $derived.by(() => {
        const categories = $settingsStore.apiCategories || [];
        const headerApp = $appStateStore.selectedApp;

        if (headerApp === "All") {
            return categories;
        }

        return categories.filter((cat) => cat.application === headerApp);
    });

    function handleDelete(id: string) {
        showAlert(
            "Delete Category",
            "Are you sure you want to delete this category?",
            "confirm",
            () => {
                settingsStore.removeApiCategory(id);
                showAlert("Success", "Category deleted successfully!");
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

<div class="max-w-7xl mx-auto py-8 px-6">
    <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "API Categories" }]}
    />

    <div class="mb-6">
        {#snippet buttons(mobile = false)}
            {#if !mobile}
                {#if !$appStateStore.isPageLocked}
                    <button
                        onclick={() => (isCreateModalOpen = true)}
                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all shrink-0"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >add</span
                        >
                        <span>New Category</span>
                    </button>
                {/if}
            {/if}
        {/snippet}

        <div class="flex items-end justify-between gap-4 mb-4 md:mb-6">
            <div>
                <h1
                    class="text-3xl font-bold text-slate-900 dark:text-white mb-2"
                >
                    API Categories
                </h1>
                <p class="text-slate-500 dark:text-slate-400">
                    Manage categories to group your API endpoints.
                </p>
            </div>

            <!-- Desktop Buttons -->
            <div class="hidden md:flex items-center gap-2">
                {@render buttons(false)}
            </div>
        </div>

        <!-- Mobile Buttons -->
        <div class="flex md:hidden items-center gap-2 mb-4">
            <div class="flex items-center gap-2">
                {@render buttons(true)}
            </div>
        </div>
    </div>

    <!-- Categories Grid -->
    {#if filteredApiCategories.length === 0}
        <div
            class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center"
        >
            <div
                class="inline-flex size-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4"
            >
                <span
                    class="material-symbols-outlined text-[32px] text-slate-400"
                    >category</span
                >
            </div>
            <h3 class="text-lg font-medium text-slate-900 dark:text-white mb-2">
                No categories found
            </h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6">
                Get started by creating your first API category.
            </p>
            <button
                onclick={() => (isCreateModalOpen = true)}
                class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
            >
                <span class="material-symbols-outlined text-[18px]">add</span>
                <span>Create Category</span>
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredApiCategories as cat}
                <div
                    class="group bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:shadow-md transition-shadow relative flex flex-col h-full"
                >
                    <div class="flex items-start justify-between mb-4">
                        <span
                            class="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        >
                            {cat.application}
                        </span>

                        <div
                            class="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex gap-1"
                        >
                            <button
                                onclick={() =>
                                    goto(
                                        `/endpoint?category=${cat.id}&readonly=true`,
                                    )}
                                class="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-500/10 rounded-md transition-colors"
                                title="Run Category Endpoints"
                            >
                                <span
                                    class="material-symbols-outlined text-[18px]"
                                    >play_arrow</span
                                >
                            </button>
                            {#if !$appStateStore.isPageLocked}
                                <button
                                    onclick={() => openEditModal(cat)}
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
                                    onclick={() => handleDelete(cat.id)}
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
                            style={cat.color
                                ? `background-color: ${cat.color}20`
                                : ""}
                        >
                            <span
                                class="material-symbols-outlined text-[20px]"
                                style={cat.color ? `color: ${cat.color}` : ""}
                            >
                                {cat.icon || "category"}
                            </span>
                        </div>
                        <a
                            href={`/categories/${cat.id}`}
                            class="block min-w-0 flex-1 group/link"
                        >
                            <h3
                                class="text-lg font-semibold text-slate-900 dark:text-white group-hover/link:text-primary transition-colors truncate"
                            >
                                {cat.name}
                            </h3>
                        </a>
                    </div>

                    <p
                        class="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 flex-grow"
                    >
                        {cat.description || "No description provided."}
                    </p>

                    <div
                        class="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-border-dark/50 mt-auto"
                    >
                        <div class="flex flex-wrap gap-1">
                            {#if Array.isArray(cat.service)}
                                {#each cat.service as svc}
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                    >
                                        {svc}
                                    </span>
                                {/each}
                            {:else if cat.service}
                                <span
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                >
                                    {cat.service}
                                </span>
                            {:else}
                                <span class="text-xs text-slate-400 italic"
                                    >No services linked</span
                                >
                            {/if}
                        </div>

                        <button
                            onclick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                settingsStore.toggleApiCategoryBookmark(cat.id);
                            }}
                            class="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                            title={cat.isBookmarked
                                ? "Remove from bookmarks"
                                : "Add to bookmarks"}
                        >
                            <span
                                class="material-symbols-outlined text-[20px] transition-colors {cat.isBookmarked
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

<Modal
    bind:isOpen={isCreateModalOpen}
    title="Create API Category"
    width="max-w-2xl"
>
    <ApiCategoryForm
        useCardStyle={false}
        onSuccess={() => {
            isCreateModalOpen = false;
            showAlert("Success", "Category created successfully!");
        }}
        onCancel={() => (isCreateModalOpen = false)}
    />
</Modal>

<Modal
    bind:isOpen={isEditModalOpen}
    title="Edit API Category"
    width="max-w-2xl"
>
    {#if selectedCategory}
        <ApiCategoryForm
            category={selectedCategory}
            useCardStyle={false}
            onSuccess={() => {
                isEditModalOpen = false;
                showAlert("Success", "Category updated successfully!");
            }}
            onCancel={() => (isEditModalOpen = false)}
        />
    {/if}
</Modal>

<style>
    .icon-filled {
        font-variation-settings:
            "FILL" 1,
            "wght" 400,
            "GRAD" 0,
            "opsz" 24;
    }
</style>
