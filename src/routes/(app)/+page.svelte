<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    // import { validateAccessToken } from "$lib/utils/auth/accessToken"; // Removed. used API.
    import { deleteCookie, getCookie } from "$lib/utils/cookie";
    import { decodeJwt } from "jose";
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

        try {
            // Decode token to get mid (unverified first)
            const payload = decodeJwt(accessToken);
            const mid = payload.mid as string;

            if (!mid) {
                console.error("No mid in token");
                deleteCookie("accessToken");
                goto("/signin");
                return;
            }

            // const valid = await validateAccessToken(accessToken, mid);
            // Replace with API call
            const res = await fetch("/api/auth/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: accessToken, mid }),
            });
            const { isValid: valid } = await res.json();

            if (!valid) {
                // Invalid token, clear and redirect
                deleteCookie("accessToken");
                goto("/signin");
                return;
            }

            isValid = true;
        } catch (e) {
            console.error("Token decode/validation failed", e);
            deleteCookie("accessToken");
            goto("/signin");
        }
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
                    Select an API category below to start testing endpoints or
                    view recent activity.
                </p>
            </div>
        </div>

        <!-- Mobile API Categories (Visible only on mobile) -->
        <div class="flex flex-col gap-2 md:hidden">
            <!-- Mobile Search Bar -->
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

            <h3 class="text-slate-900 dark:text-white text-xl font-bold mb-2">
                API Categories
            </h3>
            <div
                class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex flex-col gap-3"
            >
                <div class="flex flex-col gap-1">
                    {#each filteredCategories as category}
                        <button
                            onclick={() =>
                                goto(`/endpoint?category=${category.id}`)}
                            class="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 text-left group transition-colors"
                        >
                            <div
                                class="size-6 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-colors"
                                style={category.color
                                    ? `background-color: ${category.color}15; color: ${category.color}`
                                    : ""}
                            >
                                <span
                                    class="material-symbols-outlined text-[16px]"
                                    >{category.icon || "category"}</span
                                >
                            </div>
                            <span
                                class="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors"
                            >
                                {category.name}
                            </span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Statistics Cards -->
        {#if $settingsStore.interface?.dashboard?.showStats}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    class="flex flex-col gap-1 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative overflow-hidden group"
                >
                    <div
                        class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
                    >
                        <span
                            class="material-symbols-outlined text-6xl text-primary"
                            >bar_chart</span
                        >
                    </div>
                    <p
                        class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider"
                    >
                        Total Requests
                    </p>
                    <div class="flex items-end gap-3 mt-1">
                        <p
                            class="text-slate-900 dark:text-white text-3xl font-bold leading-none"
                        >
                            {stats.total}
                        </p>
                    </div>
                    <p class="text-slate-400 dark:text-slate-500 text-xs mt-2">
                        All-time execution count
                    </p>
                </div>
                <div
                    class="flex flex-col gap-1 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative overflow-hidden group"
                >
                    <div
                        class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
                    >
                        <span
                            class="material-symbols-outlined text-6xl text-rose-500"
                            >error</span
                        >
                    </div>
                    <p
                        class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider"
                    >
                        Failed Requests
                    </p>
                    <div class="flex items-end gap-3 mt-1">
                        <p
                            class="text-slate-900 dark:text-white text-3xl font-bold leading-none"
                        >
                            {stats.failed}
                        </p>
                    </div>
                    <p class="text-slate-400 dark:text-slate-500 text-xs mt-2">
                        Based on custom success criteria
                    </p>
                </div>
                <div
                    class="flex flex-col gap-1 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative overflow-hidden group"
                >
                    <div
                        class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
                    >
                        <span
                            class="material-symbols-outlined text-6xl text-blue-400"
                            >timer</span
                        >
                    </div>
                    <p
                        class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider"
                    >
                        Avg Latency
                    </p>
                    <div class="flex items-end gap-3 mt-1">
                        <p
                            class="text-slate-900 dark:text-white text-3xl font-bold leading-none"
                        >
                            {stats.avgLatency}
                        </p>
                    </div>
                    <p class="text-slate-400 dark:text-slate-500 text-xs mt-2">
                        Average response time
                    </p>
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
                <div
                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
                >
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr
                                    class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                                >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Time</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Application</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Endpoint Name</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20"
                                        >Method</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Status</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Result</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Latency</th
                                    >
                                </tr>
                            </thead>
                            <tbody
                                class="divide-y divide-slate-200 dark:divide-slate-700 text-sm"
                            >
                                {#each recentLogs as log}
                                    <tr
                                        class="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                    >
                                        <td
                                            class="p-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400"
                                        >
                                            {formatRelativeTime(log.timestamp)}
                                        </td>
                                        <td class="p-4">
                                            <div class="flex flex-col gap-0.5">
                                                {#if log.application}
                                                    <span
                                                        class="px-2 py-0.5 w-fit rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                                    >
                                                        {log.application}
                                                    </span>
                                                    {#if log.service || log.site}
                                                        <span
                                                            class="text-[10px] text-slate-500 dark:text-slate-400 font-mono"
                                                        >
                                                            {log.service ||
                                                                ""}{log.service &&
                                                            log.site
                                                                ? "/"
                                                                : ""}{log.site ||
                                                                ""}
                                                        </span>
                                                    {/if}
                                                {:else}
                                                    <span
                                                        class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]"
                                                        title={log.url}
                                                    >
                                                        {log.url}
                                                    </span>
                                                {/if}
                                            </div>
                                        </td>
                                        <td class="p-4">
                                            <div class="flex flex-col">
                                                <span
                                                    class="text-slate-900 dark:text-white font-medium truncate max-w-[200px]"
                                                    title={log.endpointName}
                                                    >{log.endpointName}</span
                                                >
                                                <span
                                                    class="text-slate-500 dark:text-slate-400 text-[10px] font-mono truncate max-w-[200px]"
                                                    title={log.url}
                                                    >{log.url}</span
                                                >
                                            </div>
                                        </td>
                                        <td class="p-4">
                                            <span
                                                class="px-2 py-1 rounded text-[10px] font-bold border {log.method ===
                                                'GET'
                                                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                    : log.method === 'POST'
                                                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                      : log.method === 'PUT' ||
                                                          log.method === 'PATCH'
                                                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                        : log.method ===
                                                            'DELETE'
                                                          ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                          : ''}"
                                                >{log.method}</span
                                            >
                                        </td>
                                        <td class="p-4">
                                            <span
                                                class="px-2 py-1 rounded text-[11px] font-bold uppercase {getStatusColor(
                                                    log,
                                                )}"
                                            >
                                                {log.statusCode || log.status}
                                            </span>
                                        </td>
                                        <td class="p-4">
                                            <span
                                                class="px-2 py-1 text-[10px] font-bold rounded-full uppercase {isSuccessfulLog(
                                                    log,
                                                )
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}"
                                                title={JSON.stringify(
                                                    log.responseData,
                                                )}
                                            >
                                                {getDisplayResult(log)}
                                            </span>
                                        </td>
                                        <td class="p-4 whitespace-nowrap">
                                            <div
                                                class="flex items-center gap-1.5"
                                            >
                                                <span
                                                    class="text-xs font-medium text-slate-600 dark:text-slate-300"
                                                >
                                                    {log.latency || 0}ms
                                                </span>
                                                {#if (log.latency || 0) > 500}
                                                    <span
                                                        class="w-1.5 h-1.5 rounded-full bg-amber-500"
                                                        title="Slow response"
                                                    ></span>
                                                {/if}
                                            </div>
                                        </td>
                                    </tr>
                                {:else}
                                    <tr>
                                        <td
                                            colspan="7"
                                            class="p-8 text-center text-slate-400 dark:text-slate-500"
                                        >
                                            No recent activity found.
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                    <div
                        class="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-center"
                    >
                        <button
                            onclick={() => goto("/recent-activity")}
                            class="text-sm text-primary font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
                            >View full history</button
                        >
                    </div>
                </div>
            </div>
        {/if}
        <Footer />
    </div>
{:else}
    <p>인증 확인 중...</p>
{/if}
