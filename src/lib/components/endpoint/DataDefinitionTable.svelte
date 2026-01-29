<script lang="ts">
    import { slide } from "svelte/transition";
    import TypeSelector from "$lib/components/endpoint/TypeSelector.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import DataDefinitionTable from "$lib/components/endpoint/DataDefinitionTable.svelte";
    import type {
        RequestDataField,
        ResponseDataField,
    } from "$lib/types/endpoint";

    let {
        data = $bindable([]),
        dataType = "Request", // "Request" or "Response"
        isReadOnly = false, // for display only mode if needed
        extraActions,
    } = $props<{
        data: any[];
        dataType: "Request" | "Response";
        isReadOnly?: boolean;
        extraActions?: import("svelte").Snippet;
    }>();

    // Modal state for Subfields
    let isSubfieldModalOpen = $state(false);
    let currentEditingField = $state<any>(null);
    let currentEditingIndex = $state(-1);

    function addField() {
        if (dataType === "Request") {
            data = [
                ...data,
                {
                    name: "",
                    type: "string",
                    required: false,
                    encrypt: false,
                    encoded: false,
                    description: "",
                    subFields: [],
                },
            ];
        } else {
            data = [
                ...data,
                {
                    name: "",
                    type: "string",
                    encrypt: false,
                    decoded: false,
                    description: "",
                    subFields: [],
                },
            ];
        }
    }

    function removeField(index: number) {
        data = data.filter((_: any, i: number) => i !== index);
    }

    function openSubfields(field: any, index: number) {
        currentEditingField = field;
        currentEditingIndex = index;
        // Ensure subFields array exists
        if (!currentEditingField.subFields) {
            currentEditingField.subFields = [];
        }
        isSubfieldModalOpen = true;
    }

    $effect(() => {
        // Sync back changes when modal closes or editing field updates
        if (
            currentEditingIndex !== -1 &&
            currentEditingField &&
            data[currentEditingIndex]
        ) {
            // Because currentEditingField is a reference (in JS), modifications to its subFields
            // inside the recursive table might already be mutating it.
            // However, to trigger reactivity, we might need to re-assign or use $state correctly.
            // Since we bind data, deepest mutations should propagate if using Svelte 5 runes correctly with objects.
            // Let's rely on reference mutation for subFields array content.
            data[currentEditingIndex] = currentEditingField;
        }
    });
</script>

<!-- Desktop View: Table -->
<div class="hidden md:block overflow-x-auto">
    <table class="w-full text-left border-collapse">
        <thead>
            <tr
                class="text-xs text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-background-dark/50 border-y border-slate-200 dark:border-border-dark"
            >
                <th class="px-6 py-3 font-medium w-56"
                    >Name {#if !isReadOnly}<span class="text-red-500">*</span
                        >{/if}</th
                >
                <th class="px-3 py-3 font-medium w-48"
                    >Type {#if !isReadOnly}<span class="text-red-500">*</span
                        >{/if}</th
                >
                {#if dataType === "Request"}
                    <th class="px-3 py-3 font-medium text-center w-16">Req</th>
                    <th class="px-3 py-3 font-medium text-center w-16">Enc</th>
                    <th class="px-3 py-3 font-medium text-center w-16"
                        >UrlEnc</th
                    >
                    <th class="px-3 py-3 font-medium text-center w-16">Sign</th>
                {:else}
                    <th class="px-3 py-3 font-medium text-center w-16"
                        ><!-- Req Spacer --></th
                    >
                    <th class="px-3 py-3 font-medium text-center w-16">Enc</th>
                    <th class="px-3 py-3 font-medium text-center w-16"
                        >UrlDec</th
                    >
                    <th class="px-3 py-3 font-medium text-center w-16">Sign</th>
                {/if}
                <th class="px-6 py-3 font-medium">Description</th>
                {#if !isReadOnly}
                    <th class="px-3 py-3 font-medium w-32">Action</th>
                {/if}
            </tr>
        </thead>
        <tbody class="text-sm divide-y divide-slate-100 dark:divide-slate-800">
            {#each data as field, i}
                <tr
                    class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <td
                        class="px-6 py-3 font-medium text-slate-700 dark:text-slate-300"
                    >
                        {#if isReadOnly}
                            <span>{field.name}</span>
                        {:else}
                            <input
                                type="text"
                                bind:value={field.name}
                                placeholder="Field Name"
                                class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                            />
                        {/if}
                    </td>
                    <td class="px-3 py-3">
                        {#if isReadOnly}
                            {#if field.type === "List"}
                                <button
                                    onclick={() => openSubfields(field, i)}
                                    class="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer flex items-center w-fit gap-1"
                                >
                                    {field.type}
                                    {#if field.subFields && field.subFields.length > 0}
                                        <span
                                            class="bg-indigo-200 dark:bg-indigo-800 px-1 rounded-full text-[10px] min-w-[14px] text-center"
                                            >{field.subFields.length}</span
                                        >
                                    {/if}
                                    <span
                                        class="material-symbols-outlined text-[14px]"
                                        >open_in_new</span
                                    >
                                </button>
                            {:else}
                                <span
                                    class="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-background-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border-dark inline-block"
                                >
                                    {field.type}
                                    {#if field.type === "string" && field.length}
                                        ({field.length})
                                    {/if}
                                </span>
                            {/if}
                        {:else}
                            <div class="flex gap-2">
                                <div class="flex-1">
                                    <TypeSelector bind:value={field.type} />
                                </div>
                                <input
                                    type="number"
                                    bind:value={field.length}
                                    disabled={field.type !== "string"}
                                    placeholder={field.type === "string"
                                        ? "Len"
                                        : "-"}
                                    class="w-16 px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none disabled:opacity-50 text-center"
                                />
                            </div>
                        {/if}
                    </td>

                    {#if dataType === "Request"}
                        <td class="px-3 py-3 text-center">
                            {#if isReadOnly}
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
                            {:else}
                                <input
                                    type="checkbox"
                                    bind:checked={field.required}
                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                />
                            {/if}
                        </td>
                        <td class="px-3 py-3 text-center">
                            {#if isReadOnly}
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
                            {:else}
                                <input
                                    type="checkbox"
                                    bind:checked={field.encrypt}
                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                />
                            {/if}
                        </td>
                        <td class="px-3 py-3 text-center">
                            {#if isReadOnly}
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
                            {:else}
                                <input
                                    type="checkbox"
                                    bind:checked={field.encoded}
                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                />
                            {/if}
                        </td>
                        <td class="px-3 py-3 text-center">
                            {#if isReadOnly}
                                {#if field.signingOrder}
                                    <span
                                        class="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold"
                                        >{field.signingOrder}</span
                                    >
                                {:else}
                                    <span class="text-slate-300">-</span>
                                {/if}
                            {:else}
                                <input
                                    type="number"
                                    bind:value={field.signingOrder}
                                    placeholder="-"
                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white text-center outline-none"
                                />
                            {/if}
                        </td>
                    {:else}
                        <td class="px-3 py-3 text-center">
                            <!-- Req Spacer -->
                        </td>
                        <td class="px-3 py-3 text-center">
                            {#if isReadOnly}
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
                            {:else}
                                <input
                                    type="checkbox"
                                    bind:checked={field.encrypt}
                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                />
                            {/if}
                        </td>
                        <td class="px-3 py-3 text-center">
                            {#if isReadOnly}
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
                            {:else}
                                <input
                                    type="checkbox"
                                    bind:checked={field.decoded}
                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                />
                            {/if}
                        </td>
                        <td class="px-3 py-3 text-center">
                            {#if isReadOnly}
                                {#if field.signingOrder}
                                    <span
                                        class="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold"
                                        >{field.signingOrder}</span
                                    >
                                {:else}
                                    <span class="text-slate-300">-</span>
                                {/if}
                            {:else}
                                <input
                                    type="number"
                                    bind:value={field.signingOrder}
                                    placeholder="-"
                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white text-center outline-none"
                                />
                            {/if}
                        </td>
                    {/if}

                    <td class="px-6 py-3 text-slate-500 dark:text-slate-400">
                        {#if isReadOnly}
                            <span>{field.description || "-"}</span>
                        {:else}
                            <input
                                type="text"
                                bind:value={field.description}
                                placeholder="Description"
                                class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                            />
                        {/if}
                    </td>

                    {#if !isReadOnly}
                        <td class="px-3 py-3 text-center">
                            <div class="flex items-center justify-center gap-1">
                                {#if field.type === "List"}
                                    <button
                                        onclick={() => openSubfields(field, i)}
                                        class="p-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                        title="Edit Subfields"
                                    >
                                        <span
                                            class="material-symbols-outlined text-[20px]"
                                            >list_alt</span
                                        >
                                    </button>
                                {/if}
                                <button
                                    onclick={() => removeField(i)}
                                    class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Remove Field"
                                >
                                    <span
                                        class="material-symbols-outlined text-[20px]"
                                        >delete</span
                                    >
                                </button>
                            </div>
                        </td>
                    {/if}
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<!-- Mobile View: Card List -->
<div class="md:hidden flex flex-col gap-4">
    {#each data as field, i}
        <div
            class="p-4 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl shadow-sm"
        >
            <div class="flex items-start justify-between mb-3">
                <div class="flex flex-col gap-1 min-w-0">
                    {#if isReadOnly}
                        <span
                            class="font-bold text-slate-900 dark:text-white break-all"
                            >{field.name || "Unnamed"}</span
                        >
                    {:else}
                        <input
                            type="text"
                            bind:value={field.name}
                            placeholder="Field Name"
                            class="w-full px-2 py-1 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-sm font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                        />
                    {/if}
                    <div class="flex items-center gap-2">
                        {#if isReadOnly}
                            {#if field.type === "List"}
                                <button
                                    onclick={() => openSubfields(field, i)}
                                    class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"
                                >
                                    {field.type}
                                    {#if field.subFields && field.subFields.length > 0}
                                        <span class="font-bold"
                                            >[{field.subFields.length}]</span
                                        >
                                    {/if}
                                    <span
                                        class="material-symbols-outlined text-[12px]"
                                        >open_in_new</span
                                    >
                                </button>
                            {:else}
                                <span
                                    class="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-background-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-border-dark"
                                >
                                    {field.type}{#if field.type === "string" && field.length}({field.length}){/if}
                                </span>
                            {/if}
                        {:else}
                            <div class="flex gap-1 items-center">
                                <TypeSelector bind:value={field.type} />
                                <input
                                    type="number"
                                    bind:value={field.length}
                                    disabled={field.type !== "string"}
                                    placeholder="Len"
                                    class="w-12 px-1 py-1 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-[10px] text-center outline-none disabled:opacity-50"
                                />
                            </div>
                        {/if}
                    </div>
                </div>

                {#if !isReadOnly}
                    <div class="flex gap-1">
                        {#if field.type === "List"}
                            <button
                                onclick={() => openSubfields(field, i)}
                                class="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                                <span
                                    class="material-symbols-outlined text-[20px]"
                                    >list_alt</span
                                >
                            </button>
                        {/if}
                        <button
                            onclick={() => removeField(i)}
                            class="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <span class="material-symbols-outlined text-[20px]"
                                >delete</span
                            >
                        </button>
                    </div>
                {/if}
            </div>

            <div class="grid grid-cols-2 gap-y-2 gap-x-4 mb-3">
                {#if dataType === "Request"}
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400 uppercase font-bold"
                            >Required</span
                        >
                        {#if isReadOnly}
                            <span
                                class="material-symbols-outlined text-[18px] {field.required
                                    ? 'text-green-500'
                                    : 'text-slate-300'}"
                            >
                                {field.required ? "check_circle" : "remove"}
                            </span>
                        {:else}
                            <input
                                type="checkbox"
                                bind:checked={field.required}
                                class="w-4 h-4 rounded border-slate-300 text-primary"
                            />
                        {/if}
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400 uppercase font-bold"
                            >Encrypt</span
                        >
                        {#if isReadOnly}
                            <span
                                class="material-symbols-outlined text-[18px] {field.encrypt
                                    ? 'text-purple-500'
                                    : 'text-slate-300'}"
                            >
                                {field.encrypt ? "lock" : "lock_open"}
                            </span>
                        {:else}
                            <input
                                type="checkbox"
                                bind:checked={field.encrypt}
                                class="w-4 h-4 rounded border-slate-300 text-primary"
                            />
                        {/if}
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400 uppercase font-bold"
                            >Url Enc</span
                        >
                        {#if isReadOnly}
                            <span
                                class="material-symbols-outlined text-[18px] {field.encoded
                                    ? 'text-green-500'
                                    : 'text-slate-300'}"
                            >
                                {field.encoded ? "check_circle" : "remove"}
                            </span>
                        {:else}
                            <input
                                type="checkbox"
                                bind:checked={field.encoded}
                                class="w-4 h-4 rounded border-slate-300 text-primary"
                            />
                        {/if}
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400 uppercase font-bold"
                            >Signing</span
                        >
                        {#if isReadOnly}
                            {#if field.signingOrder}
                                <span
                                    class="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold"
                                    >{field.signingOrder}</span
                                >
                            {:else}
                                <span class="text-slate-300">-</span>
                            {/if}
                        {:else}
                            <input
                                type="number"
                                bind:value={field.signingOrder}
                                placeholder="-"
                                class="w-10 px-1 py-1 rounded border border-slate-200 dark:border-border-dark text-[10px] text-center"
                            />
                        {/if}
                    </div>
                {:else}
                    <!-- Response Fields -->
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400 uppercase font-bold"
                            >Encrypt</span
                        >
                        {#if isReadOnly}
                            <span
                                class="material-symbols-outlined text-[18px] {field.encrypt
                                    ? 'text-purple-500'
                                    : 'text-slate-300'}"
                            >
                                {field.encrypt ? "lock" : "lock_open"}
                            </span>
                        {:else}
                            <input
                                type="checkbox"
                                bind:checked={field.encrypt}
                                class="w-4 h-4 rounded border-slate-300 text-primary"
                            />
                        {/if}
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400 uppercase font-bold"
                            >Url Dec</span
                        >
                        {#if isReadOnly}
                            <span
                                class="material-symbols-outlined text-[18px] {field.decoded
                                    ? 'text-green-500'
                                    : 'text-slate-300'}"
                            >
                                {field.decoded ? "check_circle" : "remove"}
                            </span>
                        {:else}
                            <input
                                type="checkbox"
                                bind:checked={field.decoded}
                                class="w-4 h-4 rounded border-slate-300 text-primary"
                            />
                        {/if}
                    </div>
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400 uppercase font-bold"
                            >Signing</span
                        >
                        {#if isReadOnly}
                            {#if field.signingOrder}
                                <span
                                    class="inline-flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold"
                                    >{field.signingOrder}</span
                                >
                            {:else}
                                <span class="text-slate-300">-</span>
                            {/if}
                        {:else}
                            <input
                                type="number"
                                bind:value={field.signingOrder}
                                placeholder="-"
                                class="w-10 px-1 py-1 rounded border border-slate-200 dark:border-border-dark text-[10px] text-center"
                            />
                        {/if}
                    </div>
                {/if}
            </div>

            {#if isReadOnly}
                {#if field.description}
                    <p
                        class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-border-dark/50 pt-3"
                    >
                        {field.description}
                    </p>
                {/if}
            {:else}
                <textarea
                    bind:value={field.description}
                    placeholder="Description"
                    rows="1"
                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-primary/50"
                ></textarea>
            {/if}
        </div>
    {/each}
</div>

<div class="mt-4 flex items-center gap-2 px-2 md:px-0">
    {#if !isReadOnly}
        <button
            onclick={addField}
            class="px-3 py-1.5 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1"
        >
            <span class="material-symbols-outlined text-[16px]">add</span>
            Add
            {dataType}
            Field
        </button>
    {/if}
    {#if extraActions}
        {@render extraActions()}
    {/if}
</div>

<!-- Recursive Modal for Subfields -->
{#if currentEditingField}
    <Modal
        bind:isOpen={isSubfieldModalOpen}
        title={`Edit Subfields for '${currentEditingField.name}'`}
        width="max-w-6xl"
    >
        <div class="flex flex-col gap-4">
            <div
                class="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-border-dark/50"
            >
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Define the structure for items in the <strong
                        >{currentEditingField.name}</strong
                    > list.
                </p>
                <!-- Recursive Call -->
                <DataDefinitionTable
                    bind:data={currentEditingField.subFields}
                    {dataType}
                    {isReadOnly}
                />
            </div>
            <div class="flex justify-end pt-2">
                <button
                    onclick={() => (isSubfieldModalOpen = false)}
                    class="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm shadow-primary/20 transition-all"
                >
                    {isReadOnly ? "Close" : "Done"}
                </button>
            </div>
        </div>
    </Modal>
{/if}

<style>
    /* Hide number input spinners */
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
    }
</style>
