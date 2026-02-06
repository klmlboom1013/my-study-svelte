<script lang="ts">
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
        ShieldCheck,
        History,
        Activity,
        CheckCircle2,
        XCircle,
        Clock,
        TrendingUp,
        BarChart3,
        ChevronRight,
        Filter,
        Loader2,
    } from "lucide-svelte";
    import { driveService } from "$lib/features/drive/services/driveService";
    import {
        authStore,
        loginWithGoogle,
    } from "$lib/features/auth/services/authService";
    import { fade, slide, scale } from "svelte/transition";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import ResultDetailModal from "$lib/components/test-suite/ResultDetailModal.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";

    // Alert Modal state
    let alertModalState = $state({
        isOpen: false,
        title: "",
        message: "",
        type: "alert" as "alert" | "confirm",
        onConfirm: undefined as (() => void) | undefined,
    });

    function showAlert(
        title: string,
        message: string,
        type: "alert" | "confirm" = "alert",
        onConfirm?: () => void,
    ) {
        alertModalState = {
            isOpen: true,
            title,
            message,
            type,
            onConfirm,
        };
    }

    // State
    let results = $state<CollectionTestResult[]>([]);
    let isLoading = $state(true);
    let isRunningAllSuites = $state(false);
    let currentRunningCollectionId = $state<string | null>(null);
    let selectedResult = $state<CollectionTestResult | null>(null);
    let showResultModal = $state(false);
    let selectedPresets = $state<Record<string, string>>({});
    let isBackupLoading = $state(false);
    let isRestoreLoading = $state(false);
    let unsubscribe: (() => void) | null = null;

    // Stats
    let totalRuns = $derived(results.length);
    let passCount = $derived(results.filter((r) => r.status === "PASS").length);
    let failCount = $derived(results.filter((r) => r.status === "FAIL").length);
    let passRate = $derived(
        totalRuns > 0 ? Math.round((passCount / totalRuns) * 100) : 0,
    );

    // Group results by collection
    type CollectionSummary = {
        id: string;
        name: string;
        lastRun: CollectionTestResult | null;
        history: CollectionTestResult[];
        passRate: number;
        presets: CollectionExecutionPreset[];
    };

    let collectionSummaries = $derived(() => {
        const map = new Map<string, CollectionSummary>();

        // Initialize with all collections that have steps
        $settingsStore.apiCollections?.forEach((c) => {
            if (c.steps && c.steps.length > 0) {
                map.set(c.id, {
                    id: c.id,
                    name: c.name,
                    lastRun: null,
                    history: [],
                    passRate: 0,
                    presets: collectionExecutionService.getHistory(c.id)
                        .presets,
                });
            }
        });

        // Populate with actual results
        results.forEach((r) => {
            const entry = map.get(r.collectionId);
            if (entry) {
                entry.history.push(r);
                if (!entry.lastRun || r.timestamp > entry.lastRun.timestamp) {
                    entry.lastRun = r;
                }
            } else {
                // Collection might have been deleted, but result still exists
                map.set(r.collectionId, {
                    id: r.collectionId,
                    name: r.collectionName,
                    lastRun: r,
                    history: [r],
                    passRate: 0,
                    presets: collectionExecutionService.getHistory(
                        r.collectionId,
                    ).presets,
                });
            }
        });

        // Calculate pass rates per collection
        map.forEach((entry) => {
            if (entry.history.length > 0) {
                const passed = entry.history.filter(
                    (h) => h.status === "PASS",
                ).length;
                entry.passRate = Math.round(
                    (passed / entry.history.length) * 100,
                );
            }
        });

        return Array.from(map.values()).sort((a, b) => {
            if (!a.lastRun) return 1;
            if (!b.lastRun) return -1;
            return b.lastRun.timestamp - a.lastRun.timestamp;
        });
    });

    onMount(() => {
        results = testResultService.getAllResults();
        isLoading = false;

        unsubscribe = testResultService.onChange(() => {
            results = testResultService.getAllResults();
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    function formatTime(timestamp: number) {
        return new Date(timestamp).toLocaleString();
    }

    function getTimeAgo(timestamp: number) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString();
    }

    function handleClearHistory() {
        showAlert(
            "Clear History",
            "Are you sure you want to clear all test history?",
            "confirm",
            () => {
                testResultService.clearAll();
            },
        );
    }
    async function handleBackup() {
        let token = $authStore.accessToken;
        if (!token) {
            try {
                const result = await loginWithGoogle();
                token = result.token;
            } catch (error) {
                showAlert("Sync Error", "Google Login failed.");
                return;
            }
        }
        if (!token) return;

        isBackupLoading = true;
        try {
            const presets = collectionExecutionService.getAllHistory();
            const results = testResultService.getAllResults();

            await driveService.saveCollectionExecutionHistory(token, presets);
            await driveService.saveTestSuiteResults(token, results);

            showAlert(
                "Backup Successful",
                "Test suite presets and history have been saved to Google Drive.",
                "alert",
            );
        } catch (error: any) {
            showAlert(
                "Backup Error",
                error.message || "Unknown error",
                "alert",
            );
        } finally {
            isBackupLoading = false;
        }
    }

    async function handleRestore() {
        let token = $authStore.accessToken;
        if (!token) {
            try {
                const result = await loginWithGoogle();
                token = result.token;
            } catch (error) {
                showAlert("Sync Error", "Google Login failed.");
                return;
            }
        }
        if (!token) return;

        showAlert(
            "Restore Data",
            "Restore presets and history from Google Drive? This will overwrite your local data.",
            "confirm",
            async () => {
                isRestoreLoading = true;
                try {
                    const presets =
                        await driveService.loadCollectionExecutionHistory(
                            token,
                        );
                    const history =
                        await driveService.loadTestSuiteResults(token);

                    if (presets)
                        collectionExecutionService.importHistory(presets);
                    if (history) testResultService.importResults(history);

                    showAlert(
                        "Restore Successful",
                        "Test suite data has been restored.",
                        "alert",
                    );
                } catch (error: any) {
                    showAlert(
                        "Restore Error",
                        error.message || "Unknown error",
                        "alert",
                    );
                } finally {
                    isRestoreLoading = false;
                }
            },
        );
    }

    function runCollection(
        collectionId: string,
        autoRun = false,
        presetId?: string,
        customReturnTo?: string,
    ) {
        let url = `/collections/run/${collectionId}`;
        const params = new URLSearchParams();
        if (autoRun) {
            params.set("autoRun", "true");
            params.set("returnTo", customReturnTo || "/test-suite");
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

    async function handleRunAllSuites() {
        if (isRunningAllSuites) return;

        const suitesToRun = collectionSummaries().filter((s) => {
            const collection = $settingsStore.apiCollections?.find(
                (c) => c.id === s.lastRun?.collectionId || c.name === s.name,
            );
            return (
                collection && collection.steps && collection.steps.length > 0
            );
        });

        if (suitesToRun.length === 0) {
            showAlert(
                "No Suites Found",
                "No collections with steps found to run.",
                "alert",
            );
            return;
        }

        showAlert(
            "Run All Suites",
            `Run ${suitesToRun.length} test suites sequentially?`,
            "confirm",
            () => {
                startRunAllSuites(suitesToRun);
            },
        );
    }

    async function startRunAllSuites(suitesToRun: CollectionSummary[]) {
        isRunningAllSuites = true;
        try {
            // Construct the run queue: collectionId:presetId,collectionId:presetId...
            const queueItems = suitesToRun
                .map((s) => {
                    const collection = $settingsStore.apiCollections?.find(
                        (c) =>
                            c.id === s.lastRun?.collectionId ||
                            c.name === s.name,
                    );
                    if (!collection) return null;
                    const presetId = selectedPresets[collection.id] || "";
                    return `${collection.id}${presetId ? ":" + presetId : ""}`;
                })
                .filter(Boolean);

            if (queueItems.length > 0) {
                const first = queueItems[0]!;
                const [cId, pId] = first.split(":");
                const rest = queueItems.slice(1).join(",");

                let returnTo = "/test-suite";
                if (rest) {
                    returnTo += `?runQueue=${encodeURIComponent(rest)}`;
                }

                runCollection(cId, true, pId, returnTo);
            }
        } finally {
            isRunningAllSuites = false;
        }
    }

    // Auto-select first preset for each collection if not selected
    $effect(() => {
        const summaries = collectionSummaries();
        summaries.forEach((s) => {
            if (s.presets && s.presets.length > 0 && !selectedPresets[s.id]) {
                selectedPresets[s.id] = s.presets[0].id;
            }
        });
    });

    // Handle sequential execution queue from URL
    $effect(() => {
        const runQueue = $page.url.searchParams.get("runQueue");
        if (runQueue && !isRunningAllSuites) {
            const queue = runQueue.split(",");
            if (queue.length > 0) {
                const nextItem = queue[0];
                const [cId, pId] = nextItem.split(":");
                const rest = queue.slice(1).join(",");

                let returnTo = "/test-suite";
                if (rest) {
                    returnTo += `?runQueue=${encodeURIComponent(rest)}`;
                }

                // Small delay to ensure results are loaded and user can see the transition
                const timer = setTimeout(() => {
                    // Clear the current queue from the URL before navigating
                    const newUrl = new URL($page.url.href);
                    newUrl.searchParams.delete("runQueue");
                    window.history.replaceState({}, "", newUrl.toString());

                    runCollection(cId, true, pId, returnTo);
                }, 2000);

                return () => clearTimeout(timer);
            }
        }
    });

    function viewResultDetails(result: CollectionTestResult) {
        selectedResult = result;
        showResultModal = true;
    }
</script>

<svelte:head>
    <title>Test Suite Dashboard | Antigravity</title>
</svelte:head>

<div class="max-w-7xl mx-auto py-8 px-6 space-y-8">
    <!-- Breadcrumbs -->
    <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Test Suite" }]}
    />

    <!-- Header Section -->
    <div class="flex items-end justify-between gap-4 mb-4 md:mb-6">
        <div class="space-y-1">
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Test Suite Dashboard
            </h1>
            <p class="text-slate-500 dark:text-slate-400">
                Monitor and analyze the execution results of your test suites.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button
                onclick={handleBackup}
                disabled={isBackupLoading}
                class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 disabled:opacity-50 min-w-[90px] justify-center shadow-sm transition-colors"
                title="Backup to Google Drive"
            >
                {#if isBackupLoading}
                    <span
                        class="material-symbols-outlined text-[18px] animate-spin"
                        >sync</span
                    >
                    <span>Wait...</span>
                {:else}
                    <span class="material-symbols-outlined text-[18px]"
                        >cloud_upload</span
                    >
                    <span>Backup</span>
                {/if}
            </button>

            <button
                onclick={handleRestore}
                disabled={isRestoreLoading}
                class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 disabled:opacity-50 min-w-[90px] justify-center shadow-sm transition-colors"
                title="Restore from Google Drive"
            >
                {#if isRestoreLoading}
                    <span
                        class="material-symbols-outlined text-[18px] animate-spin"
                        >sync</span
                    >
                    <span>Wait...</span>
                {:else}
                    <span class="material-symbols-outlined text-[18px]"
                        >cloud_download</span
                    >
                    <span>Restore</span>
                {/if}
            </button>

            <button
                onclick={handleClearHistory}
                class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 dark:bg-slate-800 dark:text-rose-400 dark:border-rose-500/20 dark:hover:bg-rose-500/10 shadow-sm transition-colors"
            >
                <span class="material-symbols-outlined text-[18px]"
                    >delete_sweep</span
                >
                <span>Clear All History</span>
            </button>

            <button
                onclick={handleRunAllSuites}
                disabled={isRunningAllSuites ||
                    collectionSummaries().length === 0}
                class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-colors disabled:opacity-50 disabled:grayscale shrink-0"
            >
                {#if isRunningAllSuites}
                    <span
                        class="material-symbols-outlined text-[18px] animate-spin"
                        >sync</span
                    >
                    <span>Running...</span>
                {:else}
                    <span class="material-symbols-outlined text-[18px]"
                        >play_arrow</span
                    >
                    <span>Run All Suites</span>
                {/if}
            </button>
        </div>
    </div>
    <!-- Overall Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Total Runs -->
        <div
            class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group"
        >
            <div class="flex items-start justify-between">
                <div class="space-y-1">
                    <span
                        class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                        >Total Runs</span
                    >
                    <div
                        class="text-3xl font-black text-slate-800 dark:text-slate-100"
                    >
                        {totalRuns}
                    </div>
                </div>
                <div
                    class="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center transition-colors group-hover:bg-blue-500/20"
                >
                    <History class="text-blue-500" size={20} />
                </div>
            </div>
        </div>

        <!-- Pass Rate -->
        <div
            class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group"
        >
            <div class="flex items-start justify-between">
                <div class="space-y-1">
                    <span
                        class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                        >Pass Rate</span
                    >
                    <div class="flex items-baseline gap-2">
                        <div class="text-3xl font-black text-emerald-500">
                            {passRate}%
                        </div>
                        {#if passRate > 90}
                            <TrendingUp size={16} class="text-emerald-500" />
                        {/if}
                    </div>
                </div>
                <div
                    class="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center transition-colors group-hover:bg-emerald-500/20"
                >
                    <CheckCircle2 class="text-emerald-500" size={20} />
                </div>
            </div>
            <!-- Progress bar -->
            <div
                class="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
            >
                <div
                    class="h-full bg-emerald-500 transition-all duration-1000"
                    style="width: {passRate}%"
                ></div>
            </div>
        </div>

        <!-- Failures -->
        <div
            class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group"
        >
            <div class="flex items-start justify-between">
                <div class="space-y-1">
                    <span
                        class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                        >Failures</span
                    >
                    <div class="text-3xl font-black text-red-500">
                        {failCount}
                    </div>
                </div>
                <div
                    class="size-10 rounded-xl bg-red-500/10 flex items-center justify-center transition-colors group-hover:bg-red-500/20"
                >
                    <XCircle class="text-red-500" size={20} />
                </div>
            </div>
        </div>

        <!-- Last Active -->
        <div
            class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group"
        >
            <div class="flex items-start justify-between">
                <div class="space-y-1">
                    <span
                        class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                        >Last Activity</span
                    >
                    <div
                        class="text-lg font-bold text-slate-700 dark:text-slate-200 truncate"
                    >
                        {results.length > 0
                            ? getTimeAgo(results[0].timestamp)
                            : "No data"}
                    </div>
                </div>
                <div
                    class="size-10 rounded-xl bg-purple-500/10 flex items-center justify-center transition-colors group-hover:bg-purple-500/20"
                >
                    <Activity class="text-purple-500" size={20} />
                </div>
            </div>
        </div>
    </div>

    <!-- Collections Section -->
    <div class="space-y-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <BarChart3 size={20} class="text-slate-400" />
                <h2
                    class="text-xl font-black text-slate-800 dark:text-slate-200"
                >
                    Collection Snapshots
                </h2>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400"
                    >Sorted by recent activity</span
                >
            </div>
        </div>

        {#if isLoading}
            <div
                class="flex flex-col items-center justify-center py-20 animate-pulse"
            >
                <Loader2 class="text-indigo-500 animate-spin mb-4" size={32} />
                <p class="text-slate-500 font-medium">
                    Loading collection data...
                </p>
            </div>
        {:else if collectionSummaries().length === 0}
            <div
                class="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 p-12 text-center"
                in:fade
            >
                <div
                    class="size-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4"
                >
                    <ShieldCheck size={32} class="text-slate-300" />
                </div>
                <h3
                    class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2"
                >
                    No active collections found
                </h3>
                <p class="text-slate-500 text-sm max-w-md mx-auto mb-6">
                    Start by creating an API collection and defining test
                    assertions to see results here.
                </p>
                <button
                    onclick={() => goto("/collections")}
                    class="px-6 py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-2xl font-bold transition-all"
                >
                    Go to Collections
                </button>
            </div>
        {:else}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {#each collectionSummaries() as summary}
                    <div
                        class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col"
                        in:slide
                    >
                        <div class="p-6 flex-1">
                            <div class="flex items-start justify-between mb-4">
                                <div class="space-y-1">
                                    <h3
                                        class="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"
                                    >
                                        {summary.name}
                                        {#if summary.lastRun?.status === "PASS"}
                                            <span
                                                class="size-2 rounded-full bg-emerald-500"
                                            ></span>
                                        {:else if summary.lastRun?.status === "FAIL"}
                                            <span
                                                class="size-2 rounded-full bg-red-500 animate-pulse"
                                            ></span>
                                        {/if}
                                    </h3>
                                    <div
                                        class="flex items-center gap-3 text-[11px] text-slate-400 font-bold uppercase tracking-tighter"
                                    >
                                        <span class="flex items-center gap-1">
                                            <Clock size={12} />
                                            {summary.lastRun
                                                ? getTimeAgo(
                                                      summary.lastRun.timestamp,
                                                  )
                                                : "Never run"}
                                        </span>
                                        <span class="flex items-center gap-1">
                                            <History size={12} />
                                            {summary.history.length} Runs
                                        </span>
                                    </div>
                                </div>
                                <div class="flex flex-col items-end gap-1">
                                    <span
                                        class="text-2xl font-black {summary.passRate >=
                                        90
                                            ? 'text-emerald-500'
                                            : summary.passRate >= 70
                                              ? 'text-amber-500'
                                              : 'text-red-500'}"
                                    >
                                        {summary.passRate}%
                                    </span>
                                    <span
                                        class="text-[10px] font-black text-slate-400 uppercase"
                                        >Success Rate</span
                                    >
                                </div>
                            </div>

                            <!-- Mini History Bubbles -->
                            <div class="flex gap-1.5 mb-6">
                                {#each summary.history
                                    .slice(0, 15)
                                    .reverse() as run}
                                    <div
                                        class="size-3 rounded-full {run.status ===
                                        'PASS'
                                            ? 'bg-emerald-500'
                                            : 'bg-red-500'} shadow-sm transition-transform hover:scale-125 cursor-help"
                                        title="{formatTime(
                                            run.timestamp,
                                        )} - {run.status}"
                                    ></div>
                                {/each}
                                {#if summary.history.length === 0}
                                    {#each Array(5) as _}
                                        <div
                                            class="size-3 rounded-full bg-slate-100 dark:bg-slate-800"
                                        ></div>
                                    {/each}
                                {/if}
                            </div>

                            {#if summary.lastRun}
                                <div
                                    class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3"
                                >
                                    <div
                                        class="flex items-center justify-between text-xs"
                                    >
                                        <span
                                            class="text-slate-500 font-bold uppercase tracking-tight"
                                            >Last Execution Result</span
                                        >
                                        <span
                                            class="font-mono text-[10px] text-slate-400"
                                            >{summary.lastRun.id}</span
                                        >
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <div class="flex-1">
                                            <div
                                                class="flex items-center justify-between mb-1.5"
                                            >
                                                <span
                                                    class="text-xs font-bold text-slate-600 dark:text-slate-300"
                                                >
                                                    {summary.lastRun
                                                        .passedSteps}/{summary
                                                        .lastRun.totalSteps} Steps
                                                    Passed
                                                </span>
                                                <span
                                                    class="text-[10px] font-bold text-slate-400"
                                                >
                                                    {Math.round(
                                                        (summary.lastRun
                                                            .passedSteps /
                                                            summary.lastRun
                                                                .totalSteps) *
                                                            100,
                                                    )}%
                                                </span>
                                            </div>
                                            <div
                                                class="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                                            >
                                                <div
                                                    class="h-full {summary
                                                        .lastRun.status ===
                                                    'PASS'
                                                        ? 'bg-emerald-500'
                                                        : 'bg-red-500'} transition-all duration-700"
                                                    style="width: {(summary
                                                        .lastRun.passedSteps /
                                                        summary.lastRun
                                                            .totalSteps) *
                                                        100}%"
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/if}

                            <!-- Preset Selection -->
                            {#if summary.presets && summary.presets.length > 0}
                                <div
                                    class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                                >
                                    <div
                                        class="flex items-center justify-between mb-2"
                                    >
                                        <span
                                            class="text-[10px] font-black text-slate-400 uppercase tracking-wider"
                                            >Execution Preset</span
                                        >
                                    </div>
                                    <div class="relative group/select">
                                        <select
                                            bind:value={
                                                selectedPresets[summary.id]
                                            }
                                            class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                                        >
                                            {#each summary.presets as preset}
                                                <option value={preset.id}
                                                    >{preset.name}</option
                                                >
                                            {/each}
                                        </select>
                                        <div
                                            class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-indigo-500 transition-colors"
                                        >
                                            <ChevronRight
                                                size={14}
                                                class="rotate-90"
                                            />
                                        </div>
                                    </div>
                                </div>
                            {/if}
                        </div>
                        <div
                            class="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between"
                        >
                            <button
                                onclick={() =>
                                    runCollection(
                                        summary.id,
                                        true,
                                        selectedPresets[summary.id],
                                    )}
                                disabled={summary.presets &&
                                    summary.presets.length > 0 &&
                                    !selectedPresets[summary.id]}
                                class="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:grayscale"
                            >
                                Execute Again
                                <ChevronRight size={14} />
                            </button>
                            <button
                                onclick={() =>
                                    goto(
                                        `/test-suite/collections/${summary.id}`,
                                    )}
                                class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-slate-300 transition-all active:scale-95"
                            >
                                View Details
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Result Detail Modal -->
<ResultDetailModal
    show={showResultModal}
    result={selectedResult}
    onClose={() => (showResultModal = false)}
    reRunDisabled={selectedResult
        ? (() => {
              const summaries = collectionSummaries();
              const summary = summaries.find(
                  (s: any) => s.id === selectedResult!.collectionId,
              );
              return !!(
                  summary &&
                  summary.presets &&
                  summary.presets.length > 0 &&
                  !selectedPresets[selectedResult!.collectionId]
              );
          })()
        : false}
    onReRun={() => {
        if (selectedResult) {
            showResultModal = false;
            runCollection(
                selectedResult.collectionId,
                true,
                selectedPresets[selectedResult.collectionId],
            );
        }
    }}
/>

<AlertModal
    bind:isOpen={alertModalState.isOpen}
    title={alertModalState.title}
    message={alertModalState.message}
    type={alertModalState.type}
    onConfirm={alertModalState.onConfirm}
/>
