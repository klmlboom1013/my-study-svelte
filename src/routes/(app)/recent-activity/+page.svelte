<script lang="ts">
    import { onMount } from "svelte";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import {
        executionService,
        type ExecutionLog,
    } from "$lib/features/execution/services/executionService";
    import { goto } from "$app/navigation";
    import Modal from "$lib/components/ui/Modal.svelte";
    import { Code } from "lucide-svelte";
    import { driveService } from "$lib/features/drive/services/driveService";
    import {
        authStore,
        loginWithGoogle,
    } from "$lib/features/auth/services/authService";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import FullLoading from "$lib/components/ui/FullLoading.svelte";
    import { settingsStore } from "$lib/stores/settingsStore";

    let logs = $state<ExecutionLog[]>([]);
    let selectedLog = $state<ExecutionLog | null>(null);
    let isDetailModalOpen = $state(false);
    let copiedSection = $state<string | null>(null);

    // Pagination State
    let currentPage = $state(1);
    const itemsPerPage = $derived(
        $settingsStore.recentActivity?.itemsPerPage || 20,
    );

    const filteredLogs = $derived(
        logs.filter((log) => {
            if (!log.application) return true;
            const config =
                $settingsStore.recentActivity?.displayFilter?.[log.application];
            if (config) {
                if (config.enabled === false) return false;
                if (log.service && config.services?.[log.service] === false)
                    return false;
            }
            return true;
        }),
    );

    const totalPages = $derived(Math.ceil(filteredLogs.length / itemsPerPage));
    const paginatedLogs = $derived(
        filteredLogs.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage,
        ),
    );

    // Reset current page when filters or itemsPerPage change
    $effect(() => {
        // This is a simple way to ensure we don't end up on an empty page
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        } else if (totalPages === 0) {
            currentPage = 1;
        }
    });

    // Sync State
    let syncState = $state<"idle" | "backup" | "restore">("idle");
    let isAlertOpen = $state(false);
    let alertTitle = $state("");
    let alertMessage = $state("");
    let alertType = $state<"alert" | "confirm">("alert");
    let onAlertConfirm = $state<(() => void) | undefined>(undefined);
    let onAlertCancel = $state<(() => void) | undefined>(undefined);

    function showAlert(
        title: string,
        message: string,
        type: "alert" | "confirm" = "alert",
        onConfirm?: () => void,
        onCancel?: () => void,
    ) {
        alertTitle = title;
        alertMessage = message;
        alertType = type;
        onAlertConfirm = onConfirm;
        onAlertCancel = onCancel;
        isAlertOpen = true;
    }

    const formatDate = (timestamp: number) => {
        const format =
            $settingsStore.recentActivity?.display?.timestampFormat ||
            "YYYY. MM. DD HH24:MI:SS";
        const date = new Date(timestamp);

        const pad = (n: number) => n.toString().padStart(2, "0");
        const pad3 = (n: number) => n.toString().padStart(3, "0");

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours24 = date.getHours();
        const hours12 = hours24 % 12 || 12;
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        const milliseconds = pad3(date.getMilliseconds());
        const ampm = hours24 >= 12 ? "pm" : "am";

        let formatted = format;
        formatted = formatted.replace("YYYY", year.toString());
        formatted = formatted.replace("YY", year.toString().slice(-2));
        formatted = formatted.replace("MM", month);
        formatted = formatted.replace("DD", day);
        formatted = formatted.replace("HH24", pad(hours24));
        formatted = formatted.replace("HH", pad(hours12));
        formatted = formatted.replace("MI", minutes);
        formatted = formatted.replace("SS", seconds);
        formatted = formatted.replace("FFF", milliseconds);

        if (format.includes("HH") && !format.includes("HH24")) {
            return `${ampm} ${formatted}`;
        }

        return formatted;
    };

    onMount(() => {
        const loadLogs = () => {
            logs = executionService.getExecutionLogs();
        };

        loadLogs();

        // Listen for changes (new logs)
        const unsubscribe = executionService.onChange(loadLogs);
        return unsubscribe;
    });

    function getStatusColor(log: ExecutionLog) {
        if (isSuccessfulLog(log)) {
            return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
        }
        return "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400";
    }

    function handleClearHistory() {
        showAlert(
            "Clear History",
            "Are you sure you want to clear all execution history?",
            "confirm",
            () => {
                executionService.clearExecutionLogs();
                logs = [];
                showAlert("Success", "Execution history cleared.");
            },
        );
    }

    async function handleDriveBackup() {
        if (syncState !== "idle") return;
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

        try {
            syncState = "backup";
            const dataToSave = executionService.getExecutionLogs();
            await driveService.saveExecutionLogs(token, dataToSave);
            showAlert("Success", "Backup successful!");
        } catch (error: any) {
            console.error(error);
            showAlert("Error", `Backup failed: ${error.message}`);
        } finally {
            syncState = "idle";
        }
    }

    async function handleDriveRestore() {
        if (syncState !== "idle") return;
        showAlert(
            "Restore History",
            "This will overwrite your local execution history. Continue?",
            "confirm",
            async () => {
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
                try {
                    syncState = "restore";
                    const data = await driveService.loadExecutionLogs(token);
                    if (data) {
                        executionService.importExecutionLogs(data);
                        logs = executionService.getExecutionLogs();
                        showAlert("Success", "Restore successful!");
                    } else {
                        showAlert("Info", "No backup found.");
                    }
                } catch (error: any) {
                    console.error(error);
                    showAlert("Error", `Restore failed: ${error.message}`);
                } finally {
                    syncState = "idle";
                }
            },
        );
    }

    function showDetails(log: ExecutionLog) {
        selectedLog = log;
        isDetailModalOpen = true;
    }

    function formatData(data: any) {
        if (!data) return "No data";
        if (typeof data === "string") {
            try {
                return JSON.stringify(JSON.parse(data), null, 2);
            } catch {
                return data;
            }
        }
        return JSON.stringify(data, null, 2);
    }

    function handleDeleteLog(id: string) {
        showAlert(
            "Delete Entry",
            "Are you sure you want to delete this log entry?",
            "confirm",
            () => {
                executionService.deleteExecutionLog(id);
                logs = logs.filter((l) => l.id !== id);
                showAlert("Success", "Log entry deleted.");
            },
        );
    }

    async function copyToClipboard(text: string, section: string) {
        try {
            await navigator.clipboard.writeText(text);
            copiedSection = section;
            setTimeout(() => {
                if (copiedSection === section) copiedSection = null;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy: ", err);
        }
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
                // Fallback to top-level status if field not found in responseData
                val = (log as any)[criteria.field];
            }
            if (val !== null && val !== undefined) {
                return criteria.successValues.includes(String(val));
            }
        }

        // Final fallback to original status
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
</script>

<svelte:head>
    <title>Recent Activity | API Tester Hub</title>
</svelte:head>

<AlertModal
    bind:isOpen={isAlertOpen}
    title={alertTitle}
    message={alertMessage}
    type={alertType}
    onConfirm={onAlertConfirm}
    onCancel={onAlertCancel}
/>

<FullLoading
    isOpen={syncState !== "idle"}
    message={syncState === "backup"
        ? "Backing up your history to Google Drive..."
        : "Restoring your history from Google Drive..."}
/>

<div class="flex flex-col gap-6">
    <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Recent Activity" }]}
    />

    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
                Recent Activity
            </h1>
            <p class="text-slate-500 dark:text-slate-400">
                View your recent endpoint execution history.
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button
                onclick={handleDriveBackup}
                disabled={syncState !== "idle"}
                class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 disabled:opacity-50 min-w-[90px] justify-center shadow-sm transition-colors flex items-center gap-1.5"
            >
                {#if syncState === "backup"}
                    <span
                        class="material-symbols-outlined text-[16px] animate-spin"
                        >sync</span
                    >
                    <span>Wait...</span>
                {:else}
                    <span class="material-symbols-outlined text-[16px]"
                        >cloud_upload</span
                    >
                    <span>Backup</span>
                {/if}
            </button>

            <button
                onclick={handleDriveRestore}
                disabled={syncState !== "idle"}
                class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 disabled:opacity-50 min-w-[90px] justify-center shadow-sm transition-colors flex items-center gap-1.5"
            >
                {#if syncState === "restore"}
                    <span
                        class="material-symbols-outlined text-[16px] animate-spin"
                        >sync</span
                    >
                    <span>Wait...</span>
                {:else}
                    <span class="material-symbols-outlined text-[16px]"
                        >cloud_download</span
                    >
                    <span>Restore</span>
                {/if}
            </button>

            <button
                onclick={handleClearHistory}
                class="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg border border-rose-200 dark:border-rose-500/20 transition-colors flex items-center gap-1.5"
            >
                <span class="material-symbols-outlined text-[16px]"
                    >delete_sweep</span
                >
                Clear All History
            </button>
        </div>
    </div>

    <div
        class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden shadow-sm"
    >
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr
                        class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800"
                    >
                        {#if $settingsStore.recentActivity?.display?.visibleColumns?.timestamp ?? true}
                            <th
                                class="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                >Timestamp</th
                            >
                        {/if}
                        {#if $settingsStore.recentActivity?.display?.visibleColumns?.application ?? true}
                            <th
                                class="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                >Application</th
                            >
                        {/if}
                        {#if $settingsStore.recentActivity?.display?.visibleColumns?.endpointName ?? true}
                            <th
                                class="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                >Endpoint Name</th
                            >
                        {/if}
                        {#if $settingsStore.recentActivity?.display?.visibleColumns?.method ?? true}
                            <th
                                class="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                >Method</th
                            >
                        {/if}
                        {#if $settingsStore.recentActivity?.display?.visibleColumns?.status ?? true}
                            <th
                                class="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                >Status</th
                            >
                        {/if}
                        {#if $settingsStore.recentActivity?.display?.visibleColumns?.result ?? true}
                            <th
                                class="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                >Result</th
                            >
                        {/if}
                        {#if $settingsStore.recentActivity?.display?.visibleColumns?.latency ?? true}
                            <th
                                class="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                >Latency</th
                            >
                        {/if}
                        {#if $settingsStore.recentActivity?.display?.visibleColumns?.actions ?? true}
                            <th
                                class="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"
                                >Actions</th
                            >
                        {/if}
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    {#each paginatedLogs as log (log.id)}
                        <tr
                            class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                        >
                            {#if $settingsStore.recentActivity?.display?.visibleColumns?.timestamp ?? true}
                                <td
                                    class="px-4 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400"
                                >
                                    {formatDate(log.timestamp)}
                                </td>
                            {/if}
                            {#if $settingsStore.recentActivity?.display?.visibleColumns?.application ?? true}
                                <td class="px-4 py-4 max-w-xs xl:max-w-md">
                                    <div class="flex flex-col gap-1">
                                        {#if log.application}
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span
                                                    class="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                                >
                                                    {log.application}
                                                </span>
                                            </div>
                                            {#if log.service || log.site}
                                                <div
                                                    class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"
                                                >
                                                    {#if log.service}
                                                        <span
                                                            class="font-medium"
                                                            >{log.service}</span
                                                        >
                                                    {/if}
                                                    {#if log.service && log.site}
                                                        <span
                                                            class="text-slate-300 dark:text-slate-600"
                                                            >/</span
                                                        >
                                                    {/if}
                                                    {#if log.site}
                                                        <span>{log.site}</span>
                                                    {/if}
                                                </div>
                                            {/if}
                                        {:else}
                                            <div
                                                class="text-xs text-slate-500 dark:text-slate-400 truncate"
                                                title={log.url}
                                            >
                                                {log.url}
                                            </div>
                                        {/if}
                                    </div>
                                </td>
                            {/if}
                            {#if $settingsStore.recentActivity?.display?.visibleColumns?.endpointName ?? true}
                                <td class="px-4 py-4 whitespace-nowrap">
                                    <button
                                        class="text-left group/link focus:outline-none"
                                        onclick={() =>
                                            goto(`/endpoint/${log.endpointId}`)}
                                    >
                                        <div
                                            class="font-medium text-slate-900 dark:text-slate-100 group-hover/link:text-primary dark:group-hover/link:text-blue-400 transition-colors"
                                        >
                                            {log.endpointName}
                                        </div>
                                        <div
                                            class="text-[10px] text-slate-400 font-mono group-hover/link:text-slate-500 dark:group-hover/link:text-slate-300 transition-colors"
                                        >
                                            {log.endpointId}
                                        </div>
                                    </button>
                                </td>
                            {/if}
                            {#if $settingsStore.recentActivity?.display?.visibleColumns?.method ?? true}
                                <td class="px-4 py-4 whitespace-nowrap">
                                    <span
                                        class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                    >
                                        {log.method || "POST"}
                                    </span>
                                </td>
                            {/if}
                            {#if $settingsStore.recentActivity?.display?.visibleColumns?.status ?? true}
                                <td class="px-4 py-4 whitespace-nowrap">
                                    <span
                                        class="px-2 py-1 rounded text-[11px] font-bold uppercase {getStatusColor(
                                            log,
                                        )}"
                                        title="Code: {log.statusCode}, Status: {log.status}"
                                    >
                                        {log.statusCode
                                            ? log.statusCode
                                            : `${log.status} (No Code)`}
                                    </span>
                                </td>
                            {/if}
                            {#if $settingsStore.recentActivity?.display?.visibleColumns?.result ?? true}
                                <td class="px-4 py-4 whitespace-nowrap">
                                    <span
                                        class="px-2 py-1 text-[10px] font-bold rounded-full uppercase {isSuccessfulLog(
                                            log,
                                        )
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}"
                                        title={JSON.stringify(log.responseData)}
                                    >
                                        {getDisplayResult(log)}
                                    </span>
                                </td>
                            {/if}
                            {#if $settingsStore.recentActivity?.display?.visibleColumns?.latency ?? true}
                                <td class="px-4 py-4 whitespace-nowrap">
                                    <div class="flex items-center gap-1.5">
                                        <span
                                            class="text-xs font-medium text-slate-600 dark:text-slate-300"
                                        >
                                            {log.latency}ms
                                        </span>
                                        {#if log.latency > 500}
                                            <span
                                                class="w-1.5 h-1.5 rounded-full bg-amber-500"
                                                title="Slow response"
                                            ></span>
                                        {/if}
                                    </div>
                                </td>
                            {/if}
                            {#if $settingsStore.recentActivity?.display?.visibleColumns?.actions ?? true}
                                <td
                                    class="px-4 py-4 whitespace-nowrap text-right"
                                >
                                    <div
                                        class="flex items-center justify-end gap-1"
                                    >
                                        {#if $settingsStore.recentActivity?.display?.actions?.showDetails ?? true}
                                            <button
                                                onclick={() => showDetails(log)}
                                                class="p-1.5 text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors"
                                                title="View Details"
                                            >
                                                <span
                                                    class="material-symbols-outlined text-[18px]"
                                                    >visibility</span
                                                >
                                            </button>
                                        {/if}

                                        {#if $settingsStore.recentActivity?.display?.actions?.showDelete ?? true}
                                            <button
                                                onclick={() =>
                                                    handleDeleteLog(log.id)}
                                                class="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                                                title="Delete log"
                                            >
                                                <span
                                                    class="material-symbols-outlined text-[18px]"
                                                    >delete</span
                                                >
                                            </button>
                                        {/if}
                                    </div>
                                </td>
                            {/if}
                        </tr>
                    {/each}

                    {#if filteredLogs.length > itemsPerPage}
                        <tr>
                            <td
                                colspan={Object.values(
                                    $settingsStore.recentActivity?.display
                                        ?.visibleColumns || {},
                                ).filter((v) => v !== false).length || 8}
                                class="px-4 py-4"
                            >
                                <div class="flex items-center justify-between">
                                    <div
                                        class="text-xs text-slate-500 dark:text-slate-400"
                                    >
                                        Showing {(currentPage - 1) *
                                            itemsPerPage +
                                            1} to {Math.min(
                                            currentPage * itemsPerPage,
                                            filteredLogs.length,
                                        )} of {filteredLogs.length} entries
                                    </div>
                                    <div class="flex items-center gap-1">
                                        <button
                                            class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            disabled={currentPage === 1}
                                            onclick={() => (currentPage = 1)}
                                            title="First Page"
                                        >
                                            <span
                                                class="material-symbols-outlined text-[18px]"
                                                >first_page</span
                                            >
                                        </button>
                                        <button
                                            class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            disabled={currentPage === 1}
                                            onclick={() => currentPage--}
                                            title="Previous Page"
                                        >
                                            <span
                                                class="material-symbols-outlined text-[18px]"
                                                >chevron_left</span
                                            >
                                        </button>

                                        <div
                                            class="flex items-center px-3 text-xs font-medium text-slate-700 dark:text-slate-300"
                                        >
                                            Page {currentPage} of {totalPages}
                                        </div>

                                        <button
                                            class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            disabled={currentPage ===
                                                totalPages}
                                            onclick={() => currentPage++}
                                            title="Next Page"
                                        >
                                            <span
                                                class="material-symbols-outlined text-[18px]"
                                                >chevron_right</span
                                            >
                                        </button>
                                        <button
                                            class="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            disabled={currentPage ===
                                                totalPages}
                                            onclick={() =>
                                                (currentPage = totalPages)}
                                            title="Last Page"
                                        >
                                            <span
                                                class="material-symbols-outlined text-[18px]"
                                                >last_page</span
                                            >
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    {/if}

                    {#if filteredLogs.length === 0}
                        <tr>
                            <td
                                colspan={Object.values(
                                    $settingsStore.recentActivity?.display
                                        ?.visibleColumns || {},
                                ).filter((v) => v !== false).length || 8}
                                class="px-4 py-12 text-center"
                            >
                                <div
                                    class="size-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600"
                                >
                                    <span
                                        class="material-symbols-outlined text-[32px]"
                                        >history</span
                                    >
                                </div>
                                <h3
                                    class="text-slate-900 dark:text-white font-medium"
                                >
                                    No execution history found
                                </h3>
                                <p
                                    class="text-sm text-slate-500 dark:text-slate-400 mt-1"
                                >
                                    Run endpoints to see your history here.
                                </p>
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </div>
</div>

<Modal
    bind:isOpen={isDetailModalOpen}
    title="Execution Details"
    width="max-w-4xl"
>
    {#if selectedLog}
        <div class="flex flex-col gap-6 p-1">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                    class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                    <h4
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2"
                    >
                        General Info
                    </h4>
                    <div class="space-y-2">
                        <div class="flex flex-col">
                            <span class="text-[11px] text-slate-500"
                                >Endpoint</span
                            >
                            <span class="text-sm font-medium dark:text-white"
                                >{selectedLog.endpointName}</span
                            >
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[11px] text-slate-500"
                                >Method / Status</span
                            >
                            <div class="flex items-center gap-2 mt-0.5">
                                <span
                                    class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                                    >{selectedLog.method || "POST"}</span
                                >
                                <span
                                    class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase {getStatusColor(
                                        selectedLog,
                                    )}"
                                    >{isSuccessfulLog(selectedLog)
                                        ? "Success"
                                        : "Failed"}</span
                                >
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                    <h4
                        class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2"
                    >
                        Execution context
                    </h4>
                    <div class="space-y-2">
                        <div class="flex flex-col">
                            <span class="text-[11px] text-slate-500"
                                >Timestamp</span
                            >
                            <span class="text-sm dark:text-slate-300"
                                >{formatDate(selectedLog.timestamp)}</span
                            >
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[11px] text-slate-500">URL</span>
                            <span
                                class="text-xs font-mono break-all text-slate-600 dark:text-slate-400 mt-0.5"
                                >{selectedLog.url}</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            {#if selectedLog.headers && Object.keys(selectedLog.headers).length > 0}
                <div class="flex flex-col gap-2">
                    <div
                        class="flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >list_alt</span
                        >
                        <h3 class="text-sm font-semibold">Request Headers</h3>
                    </div>
                    <div class="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                        <pre class="text-xs text-blue-400 font-mono"><code
                                >{JSON.stringify(
                                    selectedLog.headers,
                                    null,
                                    2,
                                )}</code
                            ></pre>
                    </div>
                </div>
            {/if}

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Request Data -->
                <div class="flex flex-col gap-2">
                    <div
                        class="flex items-center justify-between text-slate-700 dark:text-slate-300"
                    >
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]"
                                >upload</span
                            >
                            <h3 class="text-sm font-semibold">Request Data</h3>
                        </div>
                        <button
                            onclick={() =>
                                copyToClipboard(
                                    formatData(selectedLog!.requestData),
                                    "request",
                                )}
                            class="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            class:text-emerald-500={copiedSection === "request"}
                            class:text-slate-400={copiedSection !== "request"}
                        >
                            <span class="material-symbols-outlined text-[16px]">
                                {copiedSection === "request"
                                    ? "check"
                                    : "content_copy"}
                            </span>
                            {copiedSection === "request" ? "Copied!" : "Copy"}
                        </button>
                    </div>
                    <div
                        class="bg-slate-900 rounded-lg p-4 overflow-x-auto min-h-[150px] max-h-[400px]"
                    >
                        <pre class="text-xs text-blue-300 font-mono"><code
                                >{formatData(selectedLog.requestData)}</code
                            ></pre>
                    </div>
                </div>

                <!-- Response Data -->
                <div class="flex flex-col gap-2">
                    <div
                        class="flex items-center justify-between text-slate-700 dark:text-slate-300"
                    >
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[18px]"
                                >download</span
                            >
                            <h3 class="text-sm font-semibold">Response Data</h3>
                        </div>
                        <button
                            onclick={() =>
                                copyToClipboard(
                                    formatData(selectedLog!.responseData),
                                    "response",
                                )}
                            class="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            class:text-emerald-500={copiedSection ===
                                "response"}
                            class:text-slate-400={copiedSection !== "response"}
                        >
                            <span class="material-symbols-outlined text-[16px]">
                                {copiedSection === "response"
                                    ? "check"
                                    : "content_copy"}
                            </span>
                            {copiedSection === "response" ? "Copied!" : "Copy"}
                        </button>
                    </div>
                    <div
                        class="bg-slate-900 rounded-lg p-4 overflow-x-auto min-h-[150px] max-h-[400px]"
                    >
                        <pre class="text-xs text-emerald-400 font-mono"><code
                                >{formatData(selectedLog.responseData)}</code
                            ></pre>
                    </div>
                </div>
            </div>
        </div>
    {:else}
        <div class="py-20 text-center text-slate-400">
            Select a log to view details
        </div>
    {/if}
</Modal>
