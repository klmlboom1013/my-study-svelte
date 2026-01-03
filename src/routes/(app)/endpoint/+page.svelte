<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { endpointService } from "$lib/services/endpointService";
    import type { Endpoint } from "$lib/types/endpoint";

    let endpoints = $state<Endpoint[]>([]);

    onMount(() => {
        endpoints = endpointService.getEndpoints();
    });

    function handleDelete(id: string) {
        if (confirm("Are you sure you want to delete this endpoint?")) {
            endpointService.deleteEndpoint(id);
            endpoints = endpointService.getEndpoints();
        }
    }
</script>

<div class="max-w-6xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Endpoints
            </h1>
            <p class="text-slate-500 dark:text-slate-400">
                Manage your API endpoints and configurations.
            </p>
        </div>
        <button
            onclick={() => goto("/endpoint/new")}
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm shadow-primary/20"
        >
            <span class="material-symbols-outlined text-[20px]">add</span>
            New Endpoint
        </button>
    </div>

    {#if endpoints.length === 0}
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
                No endpoints yet
            </h3>
            <p class="text-slate-500 dark:text-slate-400 mb-6 text-center">
                Create your first endpoint to get started with API testing.
            </p>
            <button
                onclick={() => goto("/endpoint/new")}
                class="text-primary font-medium hover:underline"
            >
                Create new endpoint
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each endpoints as endpoint}
                <div
                    class="group bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:shadow-md transition-shadow relative"
                >
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center gap-2">
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

                    <h3
                        class="text-lg font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors cursor-pointer truncate"
                        onclick={() => goto(`/endpoint/${endpoint.id}`)}
                    >
                        {endpoint.name}
                    </h3>

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
