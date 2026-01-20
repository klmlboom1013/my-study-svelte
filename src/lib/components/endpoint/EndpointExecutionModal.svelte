<script lang="ts">
    import Modal from "$lib/components/ui/Modal.svelte";
    import { Code, Play, Plus, Trash2 } from "lucide-svelte";
    import type { Endpoint, RequestDataField } from "$lib/types/endpoint";

    let {
        isOpen = $bindable(false),
        endpoint = $bindable(null as Endpoint | null),
    } = $props();

    let requestValues = $state<Record<string, any>>({});
    let jsonResult = $state("");

    // Reset values when endpoint changes or modal opens
    $effect(() => {
        if (isOpen && endpoint) {
            // Initialize values based on schema
            requestValues = initializeValues(endpoint.requestData);
        }
    });

    function initializeValues(fields: RequestDataField[] = []) {
        const values: Record<string, any> = {};
        for (const field of fields) {
            if (field.type === "List") {
                values[field.name] = [];
            } else if (field.type === "boolean") {
                values[field.name] = false;
            } else {
                values[field.name] = "";
            }
        }
        return values;
    }

    function handleExecute() {
        // Just show the JSON for now as a proof of concept
        jsonResult = JSON.stringify(requestValues, null, 2);
        alert(`Executing endpoint: ${endpoint?.name}\n\nData:\n${jsonResult}`);
    }

    function addListItem(fieldName: string, subFields?: RequestDataField[]) {
        if (!requestValues[fieldName]) requestValues[fieldName] = [];
        requestValues[fieldName] = [
            ...requestValues[fieldName],
            initializeValues(subFields),
        ];
    }

    function removeListItem(fieldName: string, index: number) {
        requestValues[fieldName] = requestValues[fieldName].filter(
            (_: any, i: number) => i !== index,
        );
    }
</script>

{#snippet renderField(
    field: RequestDataField,
    values: any,
    path: string,
    level: number = 0,
)}
    <tr
        class="border-b border-slate-200 dark:border-border-dark last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
    >
        <!-- Name Column -->
        <td
            class="p-4 align-top w-1/3 border-r border-slate-100 dark:border-border-dark/50"
        >
            <div
                class="flex flex-col gap-1"
                style="padding-left: {level * 1.5}rem;"
            >
                <div class="flex items-center gap-2 flex-wrap">
                    <label
                        for={path}
                        class="font-semibold text-sm text-slate-700 dark:text-slate-200 break-all"
                    >
                        {field.name}
                    </label>
                    {#if field.required}
                        <span
                            class="text-[10px] uppercase font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded"
                        >
                            Required
                        </span>
                    {/if}
                </div>
                <div
                    class="text-xs text-slate-500 dark:text-slate-400 font-mono"
                >
                    {field.type}
                </div>
                {#if field.description}
                    <div class="text-xs text-slate-500 mt-1 leading-relaxed">
                        {field.description}
                    </div>
                {/if}
            </div>
        </td>

        <!-- Value Column -->
        <td class="p-4 align-top w-2/3">
            {#if field.type === "List"}
                <div class="flex flex-col gap-3">
                    {#if values[field.name] && Array.isArray(values[field.name])}
                        {#each values[field.name] as item, index}
                            <div
                                class="relative border border-slate-200 dark:border-border-dark rounded-lg overflow-hidden"
                            >
                                <div
                                    class="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-border-dark flex justify-between items-center"
                                >
                                    <span
                                        class="text-xs font-semibold text-slate-500"
                                        >Item {index + 1}</span
                                    >
                                    <button
                                        onclick={() =>
                                            removeListItem(field.name, index)}
                                        class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        title="Remove Item"
                                    >
                                        <Trash2 class="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div class="bg-white dark:bg-slate-950">
                                    <table
                                        class="w-full text-left border-collapse"
                                    >
                                        <tbody>
                                            {#each field.subFields || [] as subField}
                                                {@render renderField(
                                                    subField,
                                                    item,
                                                    `${path}[${index}].${subField.name}`,
                                                    0,
                                                )}
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        {/each}
                    {/if}
                    <button
                        onclick={() => addListItem(field.name, field.subFields)}
                        class="flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors border-dashed w-full"
                    >
                        <Plus class="w-4 h-4" />
                        Add Item
                    </button>
                </div>
            {:else if field.type === "boolean"}
                <select
                    id={path}
                    bind:value={values[field.name]}
                    class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                >
                    <option value={true}>true</option>
                    <option value={false}>false</option>
                </select>
            {:else}
                <input
                    id={path}
                    type={field.type === "number" ? "number" : "text"}
                    bind:value={values[field.name]}
                    placeholder={field.description || `Enter ${field.name}`}
                    class="w-full px-3 py-2 text-sm font-normal rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
            {/if}
        </td>
    </tr>
{/snippet}

<Modal bind:isOpen title="Execute Endpoint" width="max-w-4xl">
    {#if endpoint}
        <div class="flex flex-col gap-6">
            <!-- Header Info -->
            <div
                class="p-4 bg-slate-50 dark:bg-card-dark rounded-lg border border-slate-200 dark:border-border-dark flex flex-col gap-2"
            >
                <div class="flex items-center gap-2">
                    <span
                        class="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                        {endpoint.application}
                    </span>
                    <span
                        class="px-2 py-1 rounded text-xs font-bold bg-slate-100 dark:bg-background-dark text-slate-700 dark:text-slate-300"
                    >
                        {endpoint.method}
                    </span>
                    <h3
                        class="font-semibold text-lg text-slate-900 dark:text-white"
                    >
                        {endpoint.name}
                    </h3>
                </div>
                <code
                    class="font-mono text-sm text-slate-600 dark:text-slate-400 break-all"
                >
                    {endpoint.uri}
                </code>
            </div>

            <!-- Data Input Form -->
            <div class="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {#if endpoint.requestData && endpoint.requestData.length > 0}
                    <div
                        class="rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden"
                    >
                        <table
                            class="w-full text-left border-collapse bg-white dark:bg-slate-950/50"
                        >
                            <thead
                                class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-border-dark"
                            >
                                <tr>
                                    <th
                                        class="p-4 w-1/3 font-semibold text-sm text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-border-dark/50"
                                        >Name</th
                                    >
                                    <th
                                        class="p-4 w-2/3 font-semibold text-sm text-slate-600 dark:text-slate-400"
                                        >Description</th
                                    >
                                </tr>
                            </thead>
                            <tbody>
                                {#each endpoint.requestData as field}
                                    {@render renderField(
                                        field,
                                        requestValues,
                                        field.name,
                                    )}
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {:else}
                    <div
                        class="p-8 border-2 border-dashed border-slate-300 dark:border-border-dark rounded-xl flex flex-col items-center justify-center text-slate-500 gap-2"
                    >
                        <Code class="w-8 h-8 opacity-50" />
                        <p>No request data configured.</p>
                    </div>
                {/if}
            </div>

            <!-- Actions -->
            <div
                class="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-border-dark/50"
            >
                <button
                    onclick={() => (isOpen = false)}
                    class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button
                    onclick={handleExecute}
                    class="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm shadow-green-600/20 transition-all"
                >
                    <Play class="w-4 h-4" fill="currentColor" />
                    Execute
                </button>
            </div>
        </div>
    {/if}
</Modal>
