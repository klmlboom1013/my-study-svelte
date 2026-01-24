<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { endpointService } from "$lib/services/endpointService";
    import type { Endpoint } from "$lib/types/endpoint";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import DataDefinitionTable from "$lib/components/endpoint/DataDefinitionTable.svelte";

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

    function getSignatureMethodLabel(method?: string) {
        if (method === "HMAC_SHA256_KV")
            return "toHexString( SHA256( key=value&...&key=value&hashKey={hash key} ) )";
        if (method === "HMAC_SHA256_V")
            return "toHexString( SHA256( value&...&value&{hash key} ) )";
        return "-";
    }
</script>

<div class="w-full max-w-screen-2xl mx-auto py-8 px-0 md:px-4">
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

            <!-- Data Integrity Verification -->
            {#if endpoint.signatureMethod}
                <div
                    class="p-6 border-b border-slate-100 dark:border-border-dark/50 bg-white dark:bg-card-dark"
                >
                    <h2
                        class="text-lg font-semibold text-slate-900 dark:text-white mb-4"
                    >
                        Data Integrity Verification
                    </h2>
                    <div>
                        <span
                            class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1"
                            >Verification Method</span
                        >
                        <code
                            class="text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-background-dark px-2 py-1 rounded"
                        >
                            {getSignatureMethodLabel(endpoint.signatureMethod)}
                        </code>
                    </div>
                </div>
            {/if}

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
                    <div class="p-4 md:p-6 overflow-hidden">
                        <DataDefinitionTable
                            data={endpoint.requestData}
                            dataType="Request"
                            isReadOnly={true}
                        />
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
                    <div class="p-4 md:p-6 overflow-hidden">
                        <DataDefinitionTable
                            data={endpoint.responseData}
                            dataType="Response"
                            isReadOnly={true}
                        />
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
