<script lang="ts">
    import { page } from "$app/stores";
    import { settingsStore } from "$lib/stores/settingsStore";
    import {
        testResultService,
        type CollectionTestResult,
    } from "$lib/features/execution/services/testResultService";
    import {
        collectionExecutionService,
        type CollectionExecutionPreset,
    } from "$lib/features/execution/services/collectionExecutionService";
    import { onMount, onDestroy } from "svelte";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import {
        Play,
        History,
        CheckCircle2,
        XCircle,
        Clock,
        Calendar,
        BarChart3,
        ChevronLeft,
        ChevronRight,
        Activity,
        Search,
    } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import ResultDetailModal from "$lib/components/test-suite/ResultDetailModal.svelte";

    const id = $derived($page.params.id);
    const collection = $derived(
        $settingsStore.apiCollections?.find((c) => c.id === id),
    );

    let results = $state<CollectionTestResult[]>([]);
    let selectedResult = $state<CollectionTestResult | null>(null);
    let showResultModal = $state(false);
    let presets = $state<CollectionExecutionPreset[]>([]);
    let selectedPresetId = $state("");
    let unsubscribe: (() => void) | null = null;
    let searchQuery = $state("");

    onMount(() => {
        if (!id) return;
        const collectionId = id;
        results = testResultService.getResultsByCollection(collectionId);
        presets = collectionExecutionService.getHistory(collectionId).presets;
        unsubscribe = testResultService.onChange(() => {
            if (id) {
                results = testResultService.getResultsByCollection(id);
            }
        });

        // Auto-select first preset if available
        if (presets.length > 0 && !selectedPresetId) {
            selectedPresetId = presets[0].id;
        }
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    const filteredResults = $derived(
        results.filter(
            (r) =>
                r.collectionName
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                new Date(r.timestamp).toLocaleString().includes(searchQuery),
        ),
    );

    function viewResultDetails(result: CollectionTestResult) {
        selectedResult = result;
        showResultModal = true;
    }

    function runCollection(autoRun = false, presetId?: string) {
        let url = `/collections/run/${id}`;
        const params = new URLSearchParams();
        if (autoRun) {
            params.set("autoRun", "true");
            params.set("returnTo", `/test-suite/collections/${id}`);
        }
        if (presetId) {
            params.set("presetId", presetId);
        }

        const qs = params.toString();
        if (qs) {
            url += `?${qs}`;
        }
        goto(url);
    }

    function formatTime(timestamp: number) {
        return new Date(timestamp).toLocaleString();
    }
</script>

<div
    class="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden"
>
    <main class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <!-- Header -->
            <Breadcrumbs
                items={[
                    { label: "Home", href: "/" },
                    { label: "Test Suite", href: "/test-suite" },
                    {
                        label: collection?.name || "Collection",
                        href: `/test-suite/collections/${id}`,
                    },
                ]}
            />

            <div class="flex items-end justify-between gap-4 mb-4 md:mb-6">
                <div class="space-y-1">
                    <h1
                        class="text-3xl font-bold text-slate-800 dark:text-white mb-2"
                    >
                        {collection?.name}
                        <span class="text-blue-500">History</span>
                    </h1>
                    <p class="text-slate-500 dark:text-slate-400">
                        Detailed execution history and assertion results for
                        this collection.
                    </p>
                </div>

                <div class="flex items-center gap-3">
                    {#if presets.length > 0}
                        <select
                            bind:value={selectedPresetId}
                            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all outline-none cursor-pointer h-[38px] shadow-sm"
                        >
                            {#each presets as preset}
                                <option value={preset.id}>{preset.name}</option>
                            {/each}
                        </select>
                    {/if}
                    <button
                        onclick={() => runCollection(true, selectedPresetId)}
                        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all h-[38px] shrink-0"
                    >
                        <Play size={16} class="fill-current" />
                        <span>Execute Again</span>
                    </button>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-4 gap-4">
                <div
                    class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4"
                >
                    <div
                        class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-500"
                    >
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <p
                            class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >
                            Total Runs
                        </p>
                        <p
                            class="text-xl font-black text-slate-800 dark:text-white"
                        >
                            {results.length}
                        </p>
                    </div>
                </div>
                <div
                    class="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4"
                >
                    <div
                        class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"
                    >
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p
                            class="text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >
                            Pass Rate
                        </p>
                        <p class="text-xl font-black text-emerald-500">
                            {results.length > 0
                                ? Math.round(
                                      (results.filter(
                                          (r) => r.status === "PASS",
                                      ).length /
                                          results.length) *
                                          100,
                                  )
                                : 0}%
                        </p>
                    </div>
                </div>
                <!-- ... more stats if needed -->
            </div>

            <!-- History List -->
            <div
                class="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
                <div
                    class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50"
                >
                    <h3
                        class="font-black text-slate-800 dark:text-white flex items-center gap-2"
                    >
                        <Activity size={18} class="text-indigo-500" />
                        Execution Records
                    </h3>

                    <div class="relative w-64">
                        <Search
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={14}
                        />
                        <input
                            type="text"
                            bind:value={searchQuery}
                            placeholder="Filter records..."
                            class="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        />
                    </div>
                </div>

                {#if filteredResults.length > 0}
                    <div
                        class="divide-y divide-slate-100 dark:divide-slate-800"
                    >
                        {#each filteredResults as result}
                            <div
                                class="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group flex items-center justify-between gap-6"
                            >
                                <div class="flex items-center gap-5">
                                    <div
                                        class="w-12 h-12 rounded-2xl flex items-center justify-center {result.status ===
                                        'PASS'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-rose-500/10 text-rose-500'} font-black group-hover:scale-110 transition-transform"
                                    >
                                        {#if result.status === "PASS"}
                                            <CheckCircle2 size={24} />
                                        {:else}
                                            <XCircle size={24} />
                                        {/if}
                                    </div>
                                    <div>
                                        <div
                                            class="flex items-center gap-2 mb-0.5"
                                        >
                                            <span
                                                class="text-sm font-black text-slate-800 dark:text-white"
                                            >
                                                {formatTime(result.timestamp)}
                                            </span>
                                            <span
                                                class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-tight"
                                            >
                                                {result.status}
                                            </span>
                                        </div>
                                        <div
                                            class="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-tighter"
                                        >
                                            <span
                                                class="flex items-center gap-1"
                                            >
                                                <BarChart3 size={12} />
                                                {result.passedSteps} / {result.totalSteps}
                                                Steps Passed
                                            </span>
                                            <span
                                                class="flex items-center gap-1"
                                            >
                                                <Clock size={12} />
                                                {result.duration}ms
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onclick={() => viewResultDetails(result)}
                                    class="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-500 transition-all active:scale-95 shadow-sm"
                                >
                                    View Full Report
                                </button>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="p-20 text-center">
                        <div
                            class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-4"
                        >
                            <Activity size={32} />
                        </div>
                        <h4
                            class="text-lg font-black text-slate-800 dark:text-white mb-1"
                        >
                            No Records Found
                        </h4>
                        <p class="text-sm text-slate-500">
                            There are no execution records matching your
                            criteria.
                        </p>
                    </div>
                {/if}
            </div>
        </div>
    </main>
</div>

<!-- Result Detail Modal -->
<ResultDetailModal
    show={showResultModal}
    result={selectedResult}
    onClose={() => (showResultModal = false)}
    reRunDisabled={presets.length > 0 && !selectedPresetId}
    onReRun={() => {
        if (selectedResult) {
            showResultModal = false;
            runCollection(true, selectedPresetId);
        }
    }}
/>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #1e293b;
    }
</style>
