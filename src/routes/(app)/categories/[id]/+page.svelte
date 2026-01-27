<script lang="ts">
    import { page } from "$app/stores";
    import { settingsStore } from "$lib/stores/settingsStore";
    import ApiCategoryForm from "../ApiCategoryForm.svelte";
    import { goto } from "$app/navigation";

    let categoryId = $derived($page.params.id);
    let category = $derived.by(() => {
        const allApps = $settingsStore.applications || [];
        for (const app of allApps) {
            const found = (app.apiCategories || []).find(
                (c) => c.id === categoryId,
            );
            if (found) return found;
        }
        return undefined;
    });

    $effect(() => {
        // Redirect if category not found (optional safety check)
        if (!category && $settingsStore.endpoint_parameters) {
            // giving a slight delay or just waiting for store to populate if necessary
            // but here we act as if it should be there.
            // Ideally we might show a 404 or redirect.
        }
    });
</script>

<div class="flex flex-col gap-6 max-w-3xl mx-auto">
    <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
            Edit API Category
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">
            Update category details including name, icon, and color.
        </p>
    </div>

    {#if category}
        <ApiCategoryForm {category} />
    {:else}
        <div
            class="p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
        >
            Loading category or category not found...
        </div>
    {/if}
</div>
