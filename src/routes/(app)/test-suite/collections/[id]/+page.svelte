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
    import { fade } from "svelte/transition";
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
        ChevronDown,
        Check,
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

        window.addEventListener("click", handleOutsideClick);
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
        window.removeEventListener("click", handleOutsideClick);
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

    let isPresetDropdownOpen = $state(false);
    let presetContainerRef = $state<HTMLDivElement>();

    function togglePresetDropdown() {
        isPresetDropdownOpen = !isPresetDropdownOpen;
    }

    function selectPreset(presetId: string) {
        selectedPresetId = presetId;
        isPresetDropdownOpen = false;
    }

    function handleOutsideClick(event: MouseEvent) {
        if (
            isPresetDropdownOpen &&
            presetContainerRef &&
            !presetContainerRef.contains(event.target as Node)
        ) {
            isPresetDropdownOpen = false;
        }
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

            <div
                class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 md:mb-6 min-w-0 w-full"
            >
                <div class="space-y-1 min-w-0 flex-1">
                    <h1
                        class="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2 truncate"
                    >
                        {collection?.name}
                        <span class="text-blue-500">History</span>
                    </h1>
                    <p
                        class="text-slate-500 dark:text-slate-400 text-sm md:text-base"
                    >
                        Detailed execution history and assertion results.
                    </p>
                </div>

                <div
                    class="flex flex-col md:flex-row items-stretch md:items-center gap-3 mt-4 md:mt-0 w-full md:w-auto"
                >
                    {#if presets.length > 0}
                        <div
                            class="relative w-full md:w-auto"
                            bind:this={presetContainerRef}
                        >
                            <button
                                type="button"
                                onclick={(e) => {
                                    e.stopPropagation();
                                    togglePresetDropdown();
                                }}
                                class="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm w-full md:min-w-[200px] h-[42px] text-left"
                            >
                                <span class="truncate">
                                    {presets.find(
                                        (p) => p.id === selectedPresetId,
                                    )?.name || "Select Preset"}
                                </span>
                                <ChevronDown
                                    size={16}
                                    class="ml-2 text-slate-400 shrink-0 {isPresetDropdownOpen
                                        ? 'rotate-180'
                                        : ''} transition-transform"
                                />
                            </button>

                            {#if isPresetDropdownOpen}
                                <div
                                    class="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-full md:min-w-[240px]"
                                    transition:fade={{ duration: 100 }}
                                >
                                    <div class="max-h-60 overflow-y-auto py-2">
                                        {#each presets as preset}
                                            <button
                                                type="button"
                                                onclick={() =>
                                                    selectPreset(preset.id)}
                                                class="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 {selectedPresetId ===
                                                preset.id
                                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-500/10'
                                                    : 'text-slate-600 dark:text-slate-300'}"
                                            >
                                                <span class="truncate"
                                                    >{preset.name}</span
                                                >
                                                {#if selectedPresetId === preset.id}
                                                    <Check
                                                        size={16}
                                                        class="shrink-0 ml-2"
                                                    />
                                                {/if}
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                    <button
                        onclick={() => runCollection(true, selectedPresetId)}
                        class="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all h-[42px] justify-center w-full md:w-auto shrink-0 active:scale-[0.98]"
                    >
                        <Play size={16} class="fill-current" />
                        <span>Execute Again</span>
                    </button>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                <div
                    class="p-4 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 md:gap-4 overflow-hidden"
                >
                    <div
                        class="size-9 md:size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-500 shrink-0"
                    >
                        <BarChart3 size={18} class="md:hidden" />
                        <BarChart3 size={20} class="hidden md:block" />
                    </div>
                    <div class="min-w-0">
                        <p
                            class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 truncate"
                        >
                            Total Runs
                        </p>
                        <p
                            class="text-lg md:text-xl font-black text-slate-800 dark:text-white truncate"
                        >
                            {results.length}
                        </p>
                    </div>
                </div>
                <div
                    class="p-4 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 md:gap-4 overflow-hidden"
                >
                    <div
                        class="size-9 md:size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0"
                    >
                        <CheckCircle2 size={18} class="md:hidden" />
                        <CheckCircle2 size={20} class="hidden md:block" />
                    </div>
                    <div class="min-w-0">
                        <p
                            class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 truncate"
                        >
                            Pass Rate
                        </p>
                        <p
                            class="text-lg md:text-xl font-black text-emerald-500 truncate"
                        >
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
                <!-- Add other stats if needed in the future -->
            </div>

            <!-- History List -->
            <div
                class="bg-white dark:bg-slate-900 rounded-[24px] md:rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
                <div
                    class="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 gap-4"
                >
                    <h3
                        class="font-black text-slate-800 dark:text-white flex items-center gap-2"
                    >
                        <Activity size={18} class="text-indigo-500" />
                        Execution Records
                    </h3>

                    <div class="relative w-full md:w-64">
                        <Search
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={14}
                        />
                        <input
                            type="text"
                            bind:value={searchQuery}
                            placeholder="Filter records..."
                            class="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                {#if filteredResults.length > 0}
                    <div
                        class="divide-y divide-slate-100 dark:divide-slate-800"
                    >
                        {#each filteredResults as result}
                            <div
                                class="p-5 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6"
                            >
                                <div class="flex items-center gap-4 md:gap-5">
                                    <div
                                        class="size-11 md:size-12 rounded-2xl flex items-center justify-center shrink-0 {result.status ===
                                        'PASS'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-rose-500/10 text-rose-500'} font-black group-hover:scale-110 transition-transform shadow-sm"
                                    >
                                        {#if result.status === "PASS"}
                                            <CheckCircle2
                                                class="size-6 md:size-6"
                                            />
                                        {:else}
                                            <XCircle class="size-6 md:size-6" />
                                        {/if}
                                    </div>
                                    <div class="min-w-0">
                                        <div
                                            class="flex flex-wrap items-center gap-2 mb-0.5"
                                        >
                                            <span
                                                class="text-sm font-black text-slate-800 dark:text-white truncate"
                                            >
                                                {formatTime(result.timestamp)}
                                            </span>
                                            <span
                                                class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-tight shrink-0"
                                            >
                                                {result.status}
                                            </span>
                                        </div>
                                        <div
                                            class="flex items-center gap-3 md:gap-4 text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-tighter"
                                        >
                                            <span
                                                class="flex items-center gap-1"
                                            >
                                                <BarChart3 size={12} />
                                                {result.passedSteps}/{result.totalSteps}
                                                <span class="hidden md:inline"
                                                    >Steps Passed</span
                                                >
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
                                    class="w-full md:w-auto px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-500 transition-all active:scale-95 shadow-sm text-center"
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
