<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import {
        X,
        CheckCircle2,
        XCircle,
        Clock,
        BarChart3,
        Activity,
        AlertCircle,
    } from "lucide-svelte";
    import type { CollectionTestResult } from "$lib/features/execution/services/testResultService";

    let {
        show,
        result,
        onClose,
        onReRun,
        reRunDisabled = false,
    }: {
        show: boolean;
        result: CollectionTestResult | null;
        onClose: () => void;
        onReRun?: () => void;
        reRunDisabled?: boolean;
    } = $props();

    function formatTime(timestamp: number) {
        return new Date(timestamp).toLocaleString();
    }
</script>

{#if show && result}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onclick={onClose}
        transition:fade={{ duration: 200 }}
    >
        <div
            class="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onclick={(e) => e.stopPropagation()}
            transition:scale={{ start: 0.95, duration: 200 }}
        >
            <!-- Modal Header -->
            <header
                class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50"
            >
                <div class="flex items-center gap-4">
                    <div
                        class="w-12 h-12 rounded-2xl flex items-center justify-center {result.status ===
                        'PASS'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'}"
                    >
                        {#if result.status === "PASS"}
                            <CheckCircle2 size={28} />
                        {:else}
                            <XCircle size={28} />
                        {/if}
                    </div>
                    <div>
                        <h2
                            class="text-xl font-black text-slate-800 dark:text-white"
                        >
                            {result.collectionName}
                        </h2>
                        <p
                            class="text-sm font-medium text-slate-500 dark:text-slate-400"
                        >
                            Executed at {formatTime(result.timestamp)}
                        </p>
                    </div>
                </div>
                <button
                    onclick={onClose}
                    class="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <X size={20} />
                </button>
            </header>

            <!-- Modal Body -->
            <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <!-- Summary Section -->
                <div class="grid grid-cols-3 gap-4 mb-8">
                    <div
                        class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                    >
                        <div
                            class="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1"
                        >
                            <Activity size={14} />
                            <span
                                class="text-[11px] font-bold uppercase tracking-wider"
                                >Pass Rate</span
                            >
                        </div>
                        <div
                            class="text-2xl font-black {result.status === 'PASS'
                                ? 'text-emerald-500'
                                : 'text-rose-500'}"
                        >
                            {Math.round(
                                (result.passedSteps /
                                    (result.totalSteps || 1)) *
                                    100,
                            )}%
                        </div>
                    </div>
                    <div
                        class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                    >
                        <div
                            class="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1"
                        >
                            <Clock size={14} />
                            <span
                                class="text-[11px] font-bold uppercase tracking-wider"
                                >Duration</span
                            >
                        </div>
                        <div class="text-2xl font-black text-indigo-500">
                            {result.duration}ms
                        </div>
                    </div>
                    <div
                        class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                    >
                        <div
                            class="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1"
                        >
                            <BarChart3 size={14} />
                            <span
                                class="text-[11px] font-bold uppercase tracking-wider"
                                >Steps</span
                            >
                        </div>
                        <div
                            class="text-2xl font-black text-slate-800 dark:text-white"
                        >
                            {result.passedSteps} / {result.totalSteps}
                        </div>
                    </div>
                </div>

                <!-- Step Results -->
                <h3
                    class="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"
                >
                    Step Executions
                    <span
                        class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500"
                    >
                        {result.steps.length} Steps
                    </span>
                </h3>

                <div class="space-y-4">
                    {#each result.steps as step}
                        <div
                            class="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
                        >
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-8 h-8 rounded-xl flex items-center justify-center {step.status ===
                                        'PASS'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-rose-500/10 text-rose-500'}"
                                    >
                                        {#if step.status === "PASS"}
                                            <CheckCircle2 size={16} />
                                        {:else}
                                            <XCircle size={16} />
                                        {/if}
                                    </div>
                                    <span
                                        class="font-bold text-slate-700 dark:text-slate-200"
                                        >{step.endpointName ||
                                            "Unnamed Step"}</span
                                    >
                                </div>
                                <span class="text-xs font-medium text-slate-400"
                                    >{step.latency}ms</span
                                >
                            </div>

                            {#if step.assertions && step.assertions.length > 0}
                                <div class="space-y-2 pl-11">
                                    {#each step.assertions as assertion}
                                        <div
                                            class="flex items-start gap-2 p-2 rounded-xl {assertion.success
                                                ? 'bg-emerald-50/50 dark:bg-emerald-500/5'
                                                : 'bg-rose-50/50 dark:bg-rose-500/5'} border {assertion.success
                                                ? 'border-emerald-100/50 dark:border-emerald-500/10'
                                                : 'border-rose-100/50 dark:border-rose-500/10'}"
                                        >
                                            <div
                                                class="mt-0.5 {assertion.success
                                                    ? 'text-emerald-500'
                                                    : 'text-rose-500'}"
                                            >
                                                {#if assertion.success}
                                                    <CheckCircle2 size={12} />
                                                {:else}
                                                    <AlertCircle size={12} />
                                                {/if}
                                            </div>
                                            <div class="flex-1">
                                                <div
                                                    class="flex items-center justify-between"
                                                >
                                                    <span
                                                        class="text-[11px] font-bold {assertion.success
                                                            ? 'text-emerald-700 dark:text-emerald-400'
                                                            : 'text-rose-700 dark:text-rose-400'}"
                                                    >
                                                        Assertion ID: {assertion.assertionId}
                                                    </span>
                                                    {#if !assertion.success}
                                                        <span
                                                            class="text-[10px] font-medium text-rose-500 uppercase tracking-tighter"
                                                            >Failed</span
                                                        >
                                                    {/if}
                                                </div>
                                                <div
                                                    class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5"
                                                >
                                                    Actual: <span
                                                        class="font-mono"
                                                        >{assertion.actualValue !==
                                                        undefined
                                                            ? JSON.stringify(
                                                                  assertion.actualValue,
                                                              )
                                                            : "N/A"}</span
                                                    >
                                                </div>
                                                {#if !assertion.success && assertion.message}
                                                    <div
                                                        class="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-1 p-1.5 bg-rose-100/30 dark:bg-rose-500/10 rounded-lg"
                                                    >
                                                        {assertion.message}
                                                    </div>
                                                {/if}
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <p
                                    class="text-[11px] text-slate-400 italic pl-11"
                                >
                                    No assertions evaluated for this step.
                                </p>
                            {/if}
                            {#if step.error}
                                <div
                                    class="mt-2 text-[10px] text-rose-600 dark:text-rose-400 font-medium p-2 bg-rose-100/30 dark:bg-rose-500/10 rounded-xl flex items-start gap-2 border border-rose-200/50 dark:border-rose-500/20"
                                >
                                    <AlertCircle
                                        size={12}
                                        class="mt-0.5 shrink-0"
                                    />
                                    <span>{step.error}</span>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Modal Footer -->
            <footer
                class="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50"
            >
                <button
                    onclick={onClose}
                    class="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                    Close
                </button>
                {#if onReRun}
                    <button
                        onclick={onReRun}
                        disabled={reRunDisabled}
                        class="px-6 py-2.5 text-sm font-bold bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.5]"
                    >
                        Re-Run Suite
                    </button>
                {/if}
            </footer>
        </div>
    </div>
{/if}

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
