<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { endpointService } from "$lib/services/endpointService";
    import type { Endpoint } from "$lib/types/endpoint";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";

    let endpointId = $state("");
    let endpoint = $state<Endpoint | null>(null);

    onMount(() => {
        endpointId = $page.params.id ?? "";
        if (!endpointId) {
            alert("Invalid Endpoint ID");
            goto("/endpoint");
            return;
        }
        endpoint = endpointService.getEndpoint(endpointId) || null;

        if (!endpoint) {
            alert("Endpoint not found");
            goto("/endpoint");
        }
    });

    function handleDelete() {
        if (confirm("Are you sure you want to delete this endpoint?")) {
            endpointService.deleteEndpoint(endpointId);
            goto("/endpoint");
        }
    }
</script>

<div class="w-full max-w-4xl mx-auto py-8 px-0 md:px-4">
    <div class="px-4 md:px-0">
        <Breadcrumbs
            items={[
                { label: "Home", href: "/" },
                { label: "Test Endpoint", href: "/endpoint" },
                { label: endpoint?.name || "View Endpoint" },
            ]}
        />
    </div>

    {#if endpoint}
        <div
            class="mb-8 flex flex-col md:flex-row md:justify-between md:items-start gap-4 px-4 md:px-0"
        >
            <div>
                <h1
                    class="text-3xl font-bold text-slate-900 dark:text-white mb-2"
                >
                    {endpoint.name}
                </h1>
                <p class="text-slate-500 dark:text-slate-400">
                    {endpoint.description || "No description provided."}
                </p>
            </div>
            <div class="hidden md:flex gap-2 w-full md:w-auto">
                <button
                    onclick={() => goto(`/endpoint/${endpointId}/edit`)}
                    class="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm shadow-primary/20"
                >
                    <span class="material-symbols-outlined text-[20px]"
                        >edit</span
                    >
                    Edit
                </button>
                <button
                    onclick={handleDelete}
                    class="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-card-dark text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                    <span class="material-symbols-outlined text-[20px]"
                        >delete</span
                    >
                    Delete
                </button>
            </div>
        </div>

        <div
            class="bg-white dark:bg-card-dark rounded-none md:rounded-xl border-y md:border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden mb-6"
        >
            <div
                class="p-6 border-b border-slate-100 dark:border-border-dark/50"
            >
                <h2
                    class="text-lg font-semibold text-slate-900 dark:text-white mb-4"
                >
                    Basic Information
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <span
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"
                            >Method & URI</span
                        >
                        <div class="flex items-center gap-2">
                            <span
                                class="px-2 py-1 rounded text-sm font-bold bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-slate-300"
                                >{endpoint.method}</span
                            >
                            <span
                                class="font-mono text-sm text-slate-600 dark:text-slate-400"
                                >{endpoint.uri}</span
                            >
                        </div>
                    </div>
                    <div>
                        <span
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"
                            >Request Type</span
                        >
                        <span
                            class="text-sm font-medium text-slate-700 dark:text-slate-300"
                            >{endpoint.requestType}</span
                        >
                    </div>
                    <div>
                        <span
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"
                            >Service</span
                        >
                        <span
                            class="text-sm font-medium text-slate-700 dark:text-slate-300"
                            >{endpoint.scope?.service}</span
                        >
                    </div>
                    <div>
                        <span
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"
                            >Site</span
                        >
                        <span
                            class="text-sm font-medium text-slate-700 dark:text-slate-300"
                            >{endpoint.scope?.site || "-"}</span
                        >
                    </div>
                </div>
            </div>

            <!-- Configuration -->
            <div
                class="p-6 border-b border-slate-100 dark:border-border-dark/50 bg-slate-50/50 dark:bg-background-dark/30"
            >
                <h2
                    class="text-lg font-semibold text-slate-900 dark:text-white mb-4"
                >
                    Header Configuration
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                        <span
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"
                            >Content-Type</span
                        >
                        <code
                            class="text-xs bg-slate-100 dark:bg-background-dark px-2 py-1 rounded text-slate-600 dark:text-slate-400"
                            >{endpoint.config?.contentType}</code
                        >
                    </div>
                    <div>
                        <span
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"
                            >Charset</span
                        >
                        <code
                            class="text-xs bg-slate-100 dark:bg-background-dark px-2 py-1 rounded text-slate-600 dark:text-slate-400"
                            >{endpoint.config?.charset}</code
                        >
                    </div>
                    {#if endpoint.config?.customHeaders && endpoint.config.customHeaders.length > 0}
                        <div class="col-span-1 md:col-span-2">
                            <span
                                class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2"
                                >Custom Headers</span
                            >
                            <div class="flex flex-wrap gap-2">
                                {#each endpoint.config.customHeaders as header}
                                    <span
                                        class="inline-flex items-center gap-1 text-xs bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark px-2 py-1 rounded text-slate-600 dark:text-slate-400"
                                    >
                                        <span
                                            class="font-semibold text-slate-700 dark:text-slate-300"
                                            >{header.key}:</span
                                        >
                                        {header.value}
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Request Data -->
            <div class="p-0">
                <div class="p-6 pb-2">
                    <h2
                        class="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                        Request Data Definition
                    </h2>
                </div>
                {#if endpoint.requestData && endpoint.requestData.length > 0}
                    <div class="hidden md:block overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr
                                    class="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-background-dark/50 border-y border-slate-200 dark:border-border-dark"
                                >
                                    <th class="px-6 py-3 font-medium w-56"
                                        >Name</th
                                    >
                                    <th class="px-3 py-3 font-medium w-32"
                                        >Type</th
                                    >
                                    <th
                                        class="px-3 py-3 font-medium text-center w-16"
                                        >Req</th
                                    >
                                    <th
                                        class="px-3 py-3 font-medium text-center w-16"
                                        >Enc</th
                                    >
                                    <th
                                        class="px-3 py-3 font-medium text-center w-16"
                                        >UrlEnc</th
                                    >
                                    <th
                                        class="px-3 py-3 font-medium text-center w-16"
                                        >Sign</th
                                    >
                                    <th class="px-6 py-3 font-medium"
                                        >Description</th
                                    >
                                </tr>
                            </thead>
                            <tbody
                                class="text-sm divide-y divide-slate-100 dark:divide-slate-800"
                            >
                                {#each endpoint.requestData as field}
                                    <tr
                                        class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td
                                            class="px-6 py-3 font-medium text-slate-700 dark:text-slate-300"
                                            >{field.name}</td
                                        >
                                        <td class="px-3 py-3">
                                            <span
                                                class="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-background-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border-dark"
                                            >
                                                {field.type}
                                                {#if field.type === "string" && field.length}
                                                    ({field.length})
                                                {/if}
                                            </span>
                                        </td>
                                        <td class="px-3 py-3 text-center">
                                            {#if field.required}
                                                <span
                                                    class="material-symbols-outlined text-green-500 text-[18px]"
                                                    >check_circle</span
                                                >
                                            {:else}
                                                <span
                                                    class="material-symbols-outlined text-slate-300 text-[18px]"
                                                    >remove</span
                                                >
                                            {/if}
                                        </td>
                                        <td class="px-3 py-3 text-center">
                                            {#if field.encrypt}
                                                <span
                                                    class="material-symbols-outlined text-purple-500 text-[18px]"
                                                    >lock</span
                                                >
                                            {:else}
                                                <span
                                                    class="material-symbols-outlined text-slate-300 text-[18px]"
                                                    >lock_open</span
                                                >
                                            {/if}
                                        </td>
                                        <td class="px-3 py-3 text-center">
                                            {#if field.encoded}
                                                <span
                                                    class="material-symbols-outlined text-green-500 text-[18px]"
                                                    >check_circle</span
                                                >
                                            {:else}
                                                <span
                                                    class="material-symbols-outlined text-slate-300 text-[18px]"
                                                    >remove</span
                                                >
                                            {/if}
                                        </td>
                                        <td class="px-3 py-3 text-center">
                                            {#if field.signingOrder}
                                                <span
                                                    class="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold"
                                                    >{field.signingOrder}</span
                                                >
                                            {:else}
                                                <span class="text-slate-300"
                                                    >-</span
                                                >
                                            {/if}
                                        </td>
                                        <td
                                            class="px-6 py-3 text-slate-500 dark:text-slate-400"
                                            >{field.description || "-"}</td
                                        >
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                    <!-- Mobile View -->
                    <div class="md:hidden flex flex-col gap-4 p-4">
                        {#each endpoint.requestData as field}
                            <div
                                class="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg p-4 shadow-sm flex flex-col gap-3"
                            >
                                <div class="flex justify-between items-start">
                                    <div class="flex flex-col">
                                        <span
                                            class="font-bold text-slate-900 dark:text-white"
                                            >{field.name}</span
                                        >
                                        <span
                                            class="text-xs text-slate-500 dark:text-slate-400 mt-1"
                                            >{field.description ||
                                                "No description"}</span
                                        >
                                    </div>
                                    <span
                                        class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                    >
                                        {field.type}
                                        {#if field.type === "string" && field.length}
                                            ({field.length})
                                        {/if}
                                    </span>
                                </div>
                                <div
                                    class="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
                                >
                                    <div
                                        class="flex flex-col items-center gap-1"
                                    >
                                        <span
                                            class="text-[10px] uppercase font-bold text-slate-400"
                                            >Req</span
                                        >
                                        {#if field.required}
                                            <span
                                                class="material-symbols-outlined text-green-500 text-[20px]"
                                                >check_circle</span
                                            >
                                        {:else}
                                            <span
                                                class="material-symbols-outlined text-slate-300 text-[20px]"
                                                >remove</span
                                            >
                                        {/if}
                                    </div>
                                    <div
                                        class="flex flex-col items-center gap-1"
                                    >
                                        <span
                                            class="text-[10px] uppercase font-bold text-slate-400"
                                            >Enc</span
                                        >
                                        {#if field.encrypt}
                                            <span
                                                class="material-symbols-outlined text-purple-500 text-[20px]"
                                                >lock</span
                                            >
                                        {:else}
                                            <span
                                                class="material-symbols-outlined text-slate-300 text-[20px]"
                                                >lock_open</span
                                            >
                                        {/if}
                                    </div>
                                    <div
                                        class="flex flex-col items-center gap-1"
                                    >
                                        <span
                                            class="text-[10px] uppercase font-bold text-slate-400"
                                            >Url</span
                                        >
                                        {#if field.encoded}
                                            <span
                                                class="material-symbols-outlined text-green-500 text-[20px]"
                                                >check_circle</span
                                            >
                                        {:else}
                                            <span
                                                class="material-symbols-outlined text-slate-300 text-[20px]"
                                                >remove</span
                                            >
                                        {/if}
                                    </div>
                                    <div
                                        class="flex flex-col items-center gap-1"
                                    >
                                        <span
                                            class="text-[10px] uppercase font-bold text-slate-400"
                                            >Sign</span
                                        >
                                        {#if field.signingOrder}
                                            <span
                                                class="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold"
                                                >{field.signingOrder}</span
                                            >
                                        {:else}
                                            <span class="text-slate-300">-</span
                                            >
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div
                        class="p-6 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-background-dark/30 m-6 rounded-lg border border-dashed border-slate-200 dark:border-border-dark"
                    >
                        No request data defined for this endpoint.
                    </div>
                {/if}
            </div>

            <!-- Response Data -->
            <div
                class="p-0 border-t border-slate-100 dark:border-border-dark/50"
            >
                <div class="p-6 pb-2">
                    <h2
                        class="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                        Response Data Definition
                    </h2>
                </div>
                {#if endpoint.responseData && endpoint.responseData.length > 0}
                    <div class="hidden md:block overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr
                                    class="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-background-dark/50 border-y border-slate-200 dark:border-border-dark"
                                >
                                    <th class="px-6 py-3 font-medium w-56"
                                        >Name</th
                                    >
                                    <th class="px-3 py-3 font-medium w-48"
                                        >Type</th
                                    >
                                    <th
                                        class="px-3 py-3 font-medium text-center w-16"
                                        >Enc</th
                                    >
                                    <th
                                        class="px-3 py-3 font-medium text-center w-16"
                                        >UrlDec</th
                                    >
                                    <th
                                        class="px-3 py-3 font-medium text-center w-16"
                                        >Sign</th
                                    >
                                    <th class="px-6 py-3 font-medium"
                                        >Description</th
                                    >
                                </tr>
                            </thead>
                            <tbody
                                class="text-sm divide-y divide-slate-100 dark:divide-slate-800"
                            >
                                {#each endpoint.responseData as field}
                                    <tr
                                        class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <td
                                            class="px-6 py-3 font-medium text-slate-700 dark:text-slate-300"
                                            >{field.name}</td
                                        >
                                        <td class="px-3 py-3">
                                            <span
                                                class="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-background-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border-dark"
                                            >
                                                {field.type}
                                                {#if field.type === "string" && field.length}
                                                    ({field.length})
                                                {/if}
                                            </span>
                                        </td>
                                        <td class="px-3 py-3 text-center">
                                            {#if field.encrypt}
                                                <span
                                                    class="material-symbols-outlined text-purple-500 text-[18px]"
                                                    >lock</span
                                                >
                                            {:else}
                                                <span
                                                    class="material-symbols-outlined text-slate-300 text-[18px]"
                                                    >lock_open</span
                                                >
                                            {/if}
                                        </td>
                                        <td class="px-3 py-3 text-center">
                                            {#if field.decoded}
                                                <span
                                                    class="material-symbols-outlined text-green-500 text-[18px]"
                                                    >check_circle</span
                                                >
                                            {:else}
                                                <span
                                                    class="material-symbols-outlined text-slate-300 text-[18px]"
                                                    >remove</span
                                                >
                                            {/if}
                                        </td>
                                        <td class="px-3 py-3 text-center">
                                            {#if endpoint.requestType === "FORM" && field.signingOrder}
                                                <span
                                                    class="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold"
                                                    >{field.signingOrder}</span
                                                >
                                            {:else}
                                                <span class="text-slate-300"
                                                    >-</span
                                                >
                                            {/if}
                                        </td>
                                        <td
                                            class="px-6 py-3 text-slate-500 dark:text-slate-400"
                                            >{field.description || "-"}</td
                                        >
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                    <!-- Mobile View -->
                    <div class="md:hidden flex flex-col gap-4 p-4">
                        {#each endpoint.responseData as field}
                            <div
                                class="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg p-4 shadow-sm flex flex-col gap-3"
                            >
                                <div class="flex justify-between items-start">
                                    <div class="flex flex-col">
                                        <span
                                            class="font-bold text-slate-900 dark:text-white"
                                            >{field.name}</span
                                        >
                                        <span
                                            class="text-xs text-slate-500 dark:text-slate-400 mt-1"
                                            >{field.description ||
                                                "No description"}</span
                                        >
                                    </div>
                                    <span
                                        class="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                    >
                                        {field.type}
                                        {#if field.type === "string" && field.length}
                                            ({field.length})
                                        {/if}
                                    </span>
                                </div>
                                <div
                                    class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"
                                >
                                    <div
                                        class="flex flex-col items-center gap-1"
                                    >
                                        <span
                                            class="text-[10px] uppercase font-bold text-slate-400"
                                            >Enc</span
                                        >
                                        {#if field.encrypt}
                                            <span
                                                class="material-symbols-outlined text-purple-500 text-[20px]"
                                                >lock</span
                                            >
                                        {:else}
                                            <span
                                                class="material-symbols-outlined text-slate-300 text-[20px]"
                                                >lock_open</span
                                            >
                                        {/if}
                                    </div>
                                    <div
                                        class="flex flex-col items-center gap-1"
                                    >
                                        <span
                                            class="text-[10px] uppercase font-bold text-slate-400"
                                            >UrlDec</span
                                        >
                                        {#if field.decoded}
                                            <span
                                                class="material-symbols-outlined text-green-500 text-[20px]"
                                                >check_circle</span
                                            >
                                        {:else}
                                            <span
                                                class="material-symbols-outlined text-slate-300 text-[20px]"
                                                >remove</span
                                            >
                                        {/if}
                                    </div>
                                    <div
                                        class="flex flex-col items-center gap-1"
                                    >
                                        <span
                                            class="text-[10px] uppercase font-bold text-slate-400"
                                            >Sign</span
                                        >
                                        {#if endpoint.requestType === "FORM" && field.signingOrder}
                                            <span
                                                class="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold"
                                                >{field.signingOrder}</span
                                            >
                                        {:else}
                                            <span class="text-slate-300">-</span
                                            >
                                        {/if}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div
                        class="p-6 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-background-dark/30 m-6 rounded-lg border border-dashed border-slate-200 dark:border-border-dark"
                    >
                        No response data defined for this endpoint.
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
