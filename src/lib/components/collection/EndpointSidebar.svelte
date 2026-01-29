<script lang="ts">
    import { endpointService } from "$lib/features/endpoints/services/endpointService";
    import { appStateStore } from "$lib/stores/appStateStore";
    import type { Endpoint } from "$lib/types/endpoint";

    let searchQuery = $state("");

    let endpoints = $derived.by(() => {
        let list = endpointService.getEndpoints();
        const headerApp = $appStateStore.selectedApp;

        if (headerApp && headerApp !== "All") {
            list = list.filter((e: Endpoint) => e.application === headerApp);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (e: Endpoint) =>
                    e.name.toLowerCase().includes(q) ||
                    e.uri.toLowerCase().includes(q),
            );
        }
        return list;
    });

    function handleDragStart(e: DragEvent, endpoint: Endpoint) {
        if (!e.dataTransfer) return;
        e.dataTransfer.setData("application/json", JSON.stringify(endpoint));
        e.dataTransfer.effectAllowed = "move";
    }
</script>

<div
    class="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-80"
>
    <div class="p-4 border-b border-slate-200 dark:border-slate-800">
        <h2
            class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4"
        >
            Endpoints
        </h2>
        <div class="relative">
            <span
                class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]"
                >search</span
            >
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search endpoints..."
                class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all"
            />
        </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-2" role="list">
        {#each endpoints as ep}
            <div
                role="listitem"
                draggable="true"
                ondragstart={(e) => handleDragStart(e, ep)}
                class="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-grab active:cursor-grabbing hover:border-primary dark:hover:border-primary transition-all group shadow-sm"
            >
                <div class="flex items-center justify-between mb-1.5">
                    <span
                        class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[9px] font-bold uppercase tracking-tighter"
                    >
                        {ep.method}
                    </span>
                    <span
                        class="material-symbols-outlined text-slate-300 group-hover:text-primary text-[16px]"
                        >drag_indicator</span
                    >
                </div>
                <div
                    class="text-[12px] font-semibold text-slate-900 dark:text-white truncate"
                    title={ep.name}
                >
                    {ep.name}
                </div>
                <div class="text-[10px] text-slate-500 truncate" title={ep.uri}>
                    {ep.uri}
                </div>
            </div>
        {/each}

        {#if endpoints.length === 0}
            <div class="text-center py-8">
                <p class="text-[11px] text-slate-500">No endpoints found.</p>
            </div>
        {/if}
    </div>
</div>
