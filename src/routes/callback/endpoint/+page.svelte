<script lang="ts">
    import { page } from "$app/stores";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";

    export let data; // GET data
    export let form; // POST data

    // Merge data from GET or POST
    $: resultData = form?.data || data?.data || {};
    $: method = form?.method || data?.method || "UNKNOWN";
</script>

<div class="max-w-screen-2xl mx-auto py-8 px-4">
    <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Endpoint Callback" }]}
    />

    <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-8">
        Endpoint Test Result
    </h1>

    <div
        class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-6 shadow-sm"
    >
        <div class="flex items-center gap-4 mb-6">
            <span
                class="px-3 py-1 rounded-full text-sm font-bold {method ===
                'POST'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}"
            >
                {method}
            </span>
            <span class="text-slate-500 dark:text-slate-400 text-sm">
                Received at {new Date().toLocaleTimeString()}
            </span>
        </div>

        <div class="space-y-4">
            <h3 class="text-lg font-semibold text-slate-800 dark:text-white">
                Received Data
            </h3>

            {#if Object.keys(resultData).length > 0}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead
                            class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50"
                        >
                            <tr>
                                <th class="px-4 py-3 rounded-tl-lg">Key</th>
                                <th class="px-4 py-3 rounded-tr-lg">Value</th>
                            </tr>
                        </thead>
                        <tbody
                            class="divide-y divide-slate-100 dark:divide-slate-800"
                        >
                            {#each Object.entries(resultData) as [key, value]}
                                <tr
                                    class="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                >
                                    <td
                                        class="px-4 py-3 font-medium text-slate-700 dark:text-slate-300"
                                    >
                                        {key}
                                    </td>
                                    <td
                                        class="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono break-all"
                                    >
                                        {value}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {:else}
                <div
                    class="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700"
                >
                    <p class="text-slate-500 dark:text-slate-400">
                        No data received
                    </p>
                </div>
            {/if}
        </div>

        <div
            class="mt-8 pt-6 border-t border-slate-200 dark:border-border-dark flex justify-end"
        >
            <a
                href="/"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
                Return to Home
            </a>
        </div>
    </div>
</div>
