<script lang="ts">
    import { page } from "$app/stores";
    import { settingsStore } from "$lib/stores/settingsStore";
    import FlowBuilder from "$lib/components/collection/FlowBuilder.svelte";

    let id = $derived($page.params.id);
    let collection = $derived(
        $settingsStore.apiCollections?.find((c) => c.id === id),
    );
</script>

{#if collection}
    <FlowBuilder {collection} />
{:else}
    <div
        class="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900"
    >
        <div class="text-center">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Collection not found
            </h1>
            <p class="text-slate-500 mb-6">
                The collection you are looking for does not exist or has been
                deleted.
            </p>
            <a
                href="/collections"
                class="text-primary hover:underline font-medium"
                >Back to Collections</a
            >
        </div>
    </div>
{/if}
