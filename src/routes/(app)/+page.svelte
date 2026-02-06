<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    // import { validateAccessToken } from "$lib/utils/auth/accessToken"; // Removed. used API.
    import { deleteCookie, getCookie } from "$lib/utils/cookie";
    import Footer from "$lib/components/layout/Footer.svelte";
    import { settingsStore } from "$lib/stores/settingsStore";
    import {
        executionService,
        type ExecutionLog,
    } from "$lib/features/execution/services/executionService";

    let isValid = $state(false);

    onMount(async () => {
        const accessToken = getCookie("accessToken");

        if (!accessToken) {
            goto("/signin");
            return;
        }

        // Token is present, grant access.
        // Real authentication state is managed by authStore/Firebase in +layout.svelte
        isValid = true;
    });

    function handleLogout() {
        deleteCookie("accessToken");

        // Cleanup Input Info if isSaveCache is not true
        const storedData = localStorage.getItem("sign-in-page");
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                if (!parsedData.isSaveCache) {
                    localStorage.removeItem("sign-in-page");
                }
            } catch (e) {
                console.error("Failed to parse sign-in-page data", e);
            }
        }

        goto("/signin");
    }

    // Mobile Search Logic
    let mobileSearchTerm = $state("");

    function handleMobileSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && mobileSearchTerm.trim()) {
            goto(`/endpoint?q=${encodeURIComponent(mobileSearchTerm.trim())}`);
        }
    }

    import { appStateStore } from "$lib/stores/appStateStore";

    // Dynamic API Categories filtering based on selected app (for Mobile View)
    let filteredCategories = $derived.by(() => {
        const allApps = $settingsStore.applications || [];
        const headerApp = $appStateStore.selectedApp;
        const isAll = !headerApp || headerApp === "All";

        let categories: any[] = [];
        for (const app of allApps) {
            if (app.apiCategories) {
                if (isAll || app.appName === headerApp) {
                    categories = [...categories, ...app.apiCategories];
                }
            }
        }
        return categories;
    });

    // Recent Activity Real Data
    let allLogs = $state<ExecutionLog[]>([]);
    let recentLogs = $state<ExecutionLog[]>([]);

    onMount(() => {
        // Load initial logs
        allLogs = executionService.getExecutionLogs();
        recentLogs = allLogs.slice(0, 5);

        // Listen for updates
        const unsubscribe = executionService.onChange(() => {
            allLogs = executionService.getExecutionLogs();
            recentLogs = allLogs.slice(0, 5);
        });

        return unsubscribe;
    });

    // Statistics Calculation
    let stats = $derived.by(() => {
        const total = allLogs.length;
        const failed = allLogs.filter((log) => !isSuccessfulLog(log)).length;
        const avgLatency =
            total > 0
                ? Math.round(
                      allLogs.reduce(
                          (acc, log) => acc + (log.latency || 0),
                          0,
                      ) / total,
                  )
                : 0;

        return {
            total: total.toLocaleString(),
            failed: failed.toLocaleString(),
            avgLatency: `${avgLatency}ms`,
        };
    });

    function formatRelativeTime(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    }

    function getNestedValue(obj: any, path: string) {
        if (!path || !obj) return null;
        const parts = path.split(".");
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) return null;
            current = current[part];
        }
        return current;
    }

    function isSuccessfulLog(log: ExecutionLog): boolean {
        const appName = log.application;
        const appCriteria = appName
            ? $settingsStore.recentActivity?.successCriteria?.[appName]
            : null;
        const defaultCriteria =
            $settingsStore.recentActivity?.successCriteria?.["Default"];
        const criteria = appCriteria || defaultCriteria;

        if (criteria?.field && criteria?.successValues?.length > 0) {
            let val = getNestedValue(log.responseData, criteria.field);
            if (val === null || val === undefined) {
                val = (log as any)[criteria.field];
            }
            if (val !== null && val !== undefined) {
                return criteria.successValues.includes(String(val));
            }
        }

        return log.status === "success";
    }

    function getDisplayResult(log: ExecutionLog) {
        const path = $settingsStore.recentActivity?.display?.resultPath;
        if (path) {
            const val = getNestedValue(log.responseData, path);
            if (val !== null && val !== undefined) {
                if (typeof val === "object") return JSON.stringify(val);
                return String(val);
            }
        }
        return isSuccessfulLog(log) ? "Success" : "Failed";
    }

    function getStatusColor(log: ExecutionLog) {
        if (isSuccessfulLog(log)) {
            return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
        }
        return "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400";
    }
</script>

{#if isValid}
    <div class="max-w-7xl mx-auto flex flex-col gap-8 py-8 px-4">
        <!-- Page Heading -->
        <div class="flex flex-wrap justify-between items-end gap-4 mt-9">
            <div class="flex flex-col gap-2">
                <h1
                    class="text-slate-900 dark:text-white text-3xl md:text-4xl font-black tracking-tight"
                >
                    Welcome back, Developer
                </h1>
                <p
                    class="text-slate-500 dark:text-slate-400 text-base font-normal"
                >
                    Testing endpoints or view recent activity.
                </p>
            </div>
        </div>

        <div class="flex flex-col gap-2 md:hidden">
            <label class="flex flex-col w-full h-10 mb-2">
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
                        placeholder="Endpoint / to Search"
                        bind:value={mobileSearchTerm}
                        onkeydown={handleMobileSearchKeydown}
                    />
                </div>
            </label>
        </div>

        <!-- Statistics Cards -->
        {#if $settingsStore.interface?.dashboard?.showStats}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Total Requests -->
                <div
                    class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group"
                >
                    <div class="flex items-start justify-between">
                        <div class="space-y-1">
                            <span
                                class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                                >Total Requests</span
                            >
                            <div
                                class="text-3xl font-black text-slate-800 dark:text-slate-100"
                            >
                                {stats.total}
                            </div>
                            <p
                                class="text-slate-400 dark:text-slate-500 text-xs mt-2"
                            >
                                All-time execution count
                            </p>
                        </div>
                        <div
                            class="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center transition-colors group-hover:bg-blue-500/20 shrink-0"
                        >
                            <span
                                class="material-symbols-outlined text-blue-500 text-[22px]"
                                >bar_chart</span
                            >
                        </div>
                    </div>
                </div>

                <!-- Failed Requests -->
                <div
                    class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group"
                >
                    <div class="flex items-start justify-between">
                        <div class="space-y-1">
                            <span
                                class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                                >Failed Requests</span
                            >
                            <div class="text-3xl font-black text-rose-500">
                                {stats.failed}
                            </div>
                            <p
                                class="text-slate-400 dark:text-slate-500 text-xs mt-2"
                            >
                                Based on custom success criteria
                            </p>
                        </div>
                        <div
                            class="size-10 rounded-xl bg-rose-500/10 flex items-center justify-center transition-colors group-hover:bg-rose-500/20 shrink-0"
                        >
                            <span
                                class="material-symbols-outlined text-rose-500 text-[22px]"
                                >error</span
                            >
                        </div>
                    </div>
                </div>

                <!-- Avg Latency -->
                <div
                    class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group"
                >
                    <div class="flex items-start justify-between">
                        <div class="space-y-1">
                            <span
                                class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                                >Avg Latency</span
                            >
                            <div
                                class="text-3xl font-black text-slate-800 dark:text-slate-100"
                            >
                                {stats.avgLatency}
                            </div>
                            <p
                                class="text-slate-400 dark:text-slate-500 text-xs mt-2"
                            >
                                Average response time
                            </p>
                        </div>
                        <div
                            class="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center transition-colors group-hover:bg-amber-500/20 shrink-0"
                        >
                            <span
                                class="material-symbols-outlined text-amber-500 text-[22px]"
                                >timer</span
                            >
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Recent Activity Section -->
        {#if $settingsStore.interface?.dashboard?.showRecentActivity}
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <h3
                        class="text-slate-900 dark:text-white text-xl font-bold"
                    >
                        Recent Activity
                    </h3>
                </div>
                {#if recentLogs.length > 0}
                    <div class="flex flex-col gap-3">
                        <!-- Desktop Table View -->
                        <div
                            class="hidden md:block overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md"
                        >
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr
                                        class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800"
                                    >
                                        <th
                                            class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                                            >App / Method</th
                                        >
                                        <th
                                            class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                                            >Endpoint / URL</th
                                        >
                                        <th
                                            class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                                            >Result</th
                                        >
                                        <th
                                            class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest"
                                            >Latency</th
                                        >
                                        <th
                                            class="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right"
                                            >Time</th
                                        >
                                    </tr>
                                </thead>
                                <tbody
                                    class="divide-y divide-slate-100 dark:divide-slate-800"
                                >
                                    {#each recentLogs as log}
                                        <tr
                                            class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer"
                                            onclick={() =>
                                                goto(
                                                    `/recent-activity?id=${log.id}`,
                                                )}
                                        >
                                            <td class="px-4 py-4">
                                                <div
                                                    class="flex flex-col gap-1.5 items-start"
                                                >
                                                    {#if log.application}
                                                        <span
                                                            class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 uppercase"
                                                        >
                                                            {log.application}
                                                        </span>
                                                    {/if}
                                                    <div
                                                        class="px-1.5 py-0.5 rounded text-[10px] font-black border {log.method ===
                                                        'GET'
                                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                            : log.method ===
                                                                'POST'
                                                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                              : log.method ===
                                                                      'PUT' ||
                                                                  log.method ===
                                                                      'PATCH'
                                                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                                : log.method ===
                                                                    'DELETE'
                                                                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                  : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}"
                                                    >
                                                        {log.method}
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-4 py-4 min-w-0">
                                                <div
                                                    class="flex flex-col gap-0.5 min-w-0"
                                                >
                                                    <span
                                                        class="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[280px]"
                                                        title={log.endpointName}
                                                    >
                                                        {log.endpointName}
                                                    </span>
                                                    <span
                                                        class="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[280px]"
                                                        title={log.url}
                                                    >
                                                        {log.url}
                                                    </span>
                                                </div>
                                            </td>
                                            <td class="px-4 py-4">
                                                <div
                                                    class="flex flex-col gap-1.5"
                                                >
                                                    <span
                                                        class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase w-fit {isSuccessfulLog(
                                                            log,
                                                        )
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}"
                                                    >
                                                        {getDisplayResult(log)}
                                                    </span>
                                                    <span
                                                        class="px-2 py-0.5 rounded text-[10px] font-black uppercase w-fit {getStatusColor(
                                                            log,
                                                        )}"
                                                    >
                                                        {log.statusCode ||
                                                            log.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td class="px-4 py-4">
                                                <div
                                                    class="flex items-center gap-1.5"
                                                >
                                                    <span
                                                        class="text-[11px] font-bold text-slate-600 dark:text-slate-400"
                                                    >
                                                        {log.latency || 0}ms
                                                    </span>
                                                    {#if (log.latency || 0) > 500}
                                                        <span
                                                            class="size-1.5 rounded-full bg-amber-500 animate-pulse"
                                                            title="Slow response"
                                                        ></span>
                                                    {/if}
                                                </div>
                                            </td>
                                            <td
                                                class="px-4 py-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium text-right"
                                            >
                                                {formatRelativeTime(
                                                    log.timestamp,
                                                )}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>

                        <!-- Mobile Card View -->
                        <div class="flex flex-col gap-3 md:hidden">
                            {#each recentLogs as log}
                                <div
                                    class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md group flex items-center justify-between gap-4"
                                >
                                    <div
                                        class="flex items-center gap-4 flex-1 min-w-0"
                                    >
                                        <!-- Method Indicator -->
                                        <div
                                            class="size-10 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 border {log.method ===
                                            'GET'
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                : log.method === 'POST'
                                                  ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                  : log.method === 'PUT' ||
                                                      log.method === 'PATCH'
                                                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                    : log.method === 'DELETE'
                                                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                      : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}"
                                        >
                                            {log.method}
                                        </div>

                                        <!-- Info -->
                                        <div
                                            class="flex flex-col gap-1 min-w-0"
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                {#if log.application}
                                                    <span
                                                        class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 uppercase"
                                                    >
                                                        {log.application}
                                                    </span>
                                                {/if}
                                                <span
                                                    class="text-xs text-slate-400 dark:text-slate-500 font-medium"
                                                >
                                                    {formatRelativeTime(
                                                        log.timestamp,
                                                    )}
                                                </span>
                                            </div>
                                            <h4
                                                class="text-sm font-bold text-slate-800 dark:text-slate-100 truncate"
                                                title={log.endpointName}
                                            >
                                                {log.endpointName}
                                            </h4>
                                            <p
                                                class="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate"
                                                title={log.url}
                                            >
                                                {log.url}
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Result & Latency -->
                                    <div
                                        class="flex flex-col items-end gap-2 shrink-0"
                                    >
                                        <div class="flex items-center gap-2">
                                            <span
                                                class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase {isSuccessfulLog(
                                                    log,
                                                )
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}"
                                            >
                                                {getDisplayResult(log)}
                                            </span>
                                            <span
                                                class="px-2 py-0.5 rounded text-[10px] font-black uppercase {getStatusColor(
                                                    log,
                                                )}"
                                            >
                                                {log.statusCode || log.status}
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="text-[11px] font-bold text-slate-600 dark:text-slate-400"
                                            >
                                                {log.latency || 0}ms
                                            </span>
                                            {#if (log.latency || 0) > 500}
                                                <span
                                                    class="size-1.5 rounded-full bg-amber-500 animate-pulse"
                                                    title="Slow response"
                                                ></span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {:else}
                    <div
                        class="bg-white dark:bg-slate-900 p-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center"
                    >
                        <span
                            class="material-symbols-outlined text-slate-300 dark:text-slate-700 text-4xl mb-2"
                            >history</span
                        >
                        <p class="text-slate-400 dark:text-slate-500 text-sm">
                            No recent activity found.
                        </p>
                    </div>
                {/if}

                <!-- Footer Action -->
                <div class="flex justify-center mt-2">
                    <button
                        onclick={() => goto("/recent-activity")}
                        class="text-sm text-primary font-bold hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 group"
                    >
                        View full history
                        <span
                            class="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform"
                            >arrow_forward</span
                        >
                    </button>
                </div>
            </div>
        {/if}
        <Footer />
    </div>
{:else}
    <p>인증 확인 중...</p>
{/if}
