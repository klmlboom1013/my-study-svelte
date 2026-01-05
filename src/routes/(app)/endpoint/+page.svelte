<script lang="ts">
    import { onMount, untrack } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { endpointService } from "$lib/services/endpointService";
    import type { Endpoint } from "$lib/types/endpoint";

    let endpoints = $state<Endpoint[]>([]);
    let searchTerm = $state("");

    onMount(() => {
        endpoints = endpointService.getEndpoints();

        // Initialize search term from URL query parameter
        const queryTerm = $page.url.searchParams.get("q");
        if (queryTerm) {
            searchTerm = queryTerm;
        }
    });

    // React to URL changes if the user searches again while on this page
    $effect(() => {
        const queryTerm = $page.url.searchParams.get("q");
        untrack(() => {
            if (queryTerm !== null && queryTerm !== searchTerm) {
                searchTerm = queryTerm;
            }
        });
    });

    let filteredEndpoints = $derived(
        endpoints.filter((endpoint) => {
            const term = searchTerm.toLowerCase();
            return (
                endpoint.name.toLowerCase().includes(term) ||
                endpoint.uri.toLowerCase().includes(term) ||
                endpoint.method.toLowerCase().includes(term)
            );
        }),
    );

    function handleDelete(id: string) {
        if (confirm("Are you sure you want to delete this endpoint?")) {
            endpointService.deleteEndpoint(id);
            endpoints = endpointService.getEndpoints();
        }
    }
</script>

<div class="max-w-6xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Endpoints
            </h1>
            <p class="text-slate-500 dark:text-slate-400">
                Manage your API endpoints and configurations.
            </p>
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
                    class="flex w-full min-w-0 flex-1 resize-none overflow-hidden bg-transparent rounded-r-lg text-slate-900 dark:text-white focus:outline-0 placeholder:text-slate-400 dark:placeholder:text-[#5a718a] px-2 text-sm"
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
            {#if !searchTerm}
                <button
                    onclick={() => goto("/endpoint/new")}
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
                            class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
                        >
                            <!--
                            <button
                                onclick={() => goto(`/endpoint/${endpoint.id}`)}
                                class="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                            >
                                <span class="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            -->
                            <button
                                onclick={() => handleDelete(endpoint.id)}
                                class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <span
                                    class="material-symbols-outlined text-[18px]"
                                    >delete</span
                                >
                            </button>
                        </div>
                    </div>

                    <a href={`/endpoint/${endpoint.id}`} class="block focus:outline-none">
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
                        class="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-border-dark/50"
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
                </div>
            {/each}
        </div>
    {/if}
</div>
