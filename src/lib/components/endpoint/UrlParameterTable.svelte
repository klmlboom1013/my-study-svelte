<script lang="ts">
    import type { UrlParameter } from "$lib/types/endpoint";

    interface Props {
        items: UrlParameter[];
        isReadOnly?: boolean;
    }

    let { items = $bindable([]), isReadOnly = false }: Props = $props();

    function addItem() {
        items = [
            ...items,
            {
                name: "",
                isRequired: false,
                maxLength: "",
                isEncrypted: false,
                isUrlEncoded: false,
                description: "",
            },
        ];
    }

    function removeItem(index: number) {
        items = items.filter((_, i) => i !== index);
    }
</script>

<div class="flex flex-col gap-3">
    {#if items.length > 0}
        <div
            class="overflow-x-auto border border-slate-200 dark:border-border-dark rounded-lg"
        >
            <table class="w-full text-left text-sm border-collapse">
                <thead
                    class="bg-slate-50 dark:bg-background-dark/50 text-slate-500 uppercase tracking-wider border-y border-slate-200 dark:border-border-dark text-xs"
                >
                    <tr>
                        <th class="px-4 py-3 min-w-[150px] font-medium">NAME</th
                        >
                        <th class="px-2 py-3 w-[80px] text-center font-medium"
                            >LEN</th
                        >
                        <th class="px-2 py-3 w-[60px] text-center font-medium"
                            >REQ</th
                        >
                        <th class="px-2 py-3 w-[60px] text-center font-medium"
                            >ENC</th
                        >
                        <th class="px-2 py-3 w-[80px] text-center font-medium"
                            >URLENC</th
                        >
                        <th class="px-4 py-3 min-w-[200px] font-medium"
                            >DESCRIPTION</th
                        >
                        {#if !isReadOnly}
                            <th
                                class="px-2 py-3 w-[60px] text-center font-medium"
                                >Action</th
                            >
                        {/if}
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    {#each items as item, i (i)}
                        <tr
                            class="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <td class="px-4 py-2">
                                {#if isReadOnly}
                                    <span
                                        class="font-medium text-slate-700 dark:text-slate-300"
                                        >{item.name}</span
                                    >
                                {:else}
                                    <input
                                        type="text"
                                        bind:value={item.name}
                                        placeholder="Param Key"
                                        class="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1"
                                    />
                                {/if}
                            </td>
                            <td class="px-2 py-2 text-center">
                                <input
                                    type="text"
                                    bind:value={item.maxLength}
                                    placeholder={isReadOnly ? "-" : "Len"}
                                    class="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 text-center disabled:opacity-100"
                                    disabled={isReadOnly}
                                />
                            </td>
                            <td class="px-2 py-2 text-center">
                                {#if isReadOnly}
                                    {#if item.isRequired}
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
                                        bind:checked={item.isRequired}
                                        class="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50"
                                    />
                                {/if}
                            </td>
                            <td class="px-2 py-2 text-center">
                                {#if isReadOnly}
                                    {#if item.isEncrypted}
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
                                        bind:checked={item.isEncrypted}
                                        class="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50"
                                    />
                                {/if}
                            </td>
                            <td class="px-2 py-2 text-center">
                                {#if isReadOnly}
                                    {#if item.isUrlEncoded}
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
                                        bind:checked={item.isUrlEncoded}
                                        class="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer disabled:opacity-50"
                                    />
                                {/if}
                            </td>
                            <td class="px-4 py-2">
                                <input
                                    type="text"
                                    bind:value={item.description}
                                    placeholder={isReadOnly
                                        ? "-"
                                        : "Description"}
                                    class="w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-2 py-1 disabled:opacity-100"
                                    disabled={isReadOnly}
                                />
                            </td>
                            {#if !isReadOnly}
                                <td class="px-2 py-2 text-center">
                                    <button
                                        onclick={() => removeItem(i)}
                                        class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Remove Parameter"
                                    >
                                        <span
                                            class="material-symbols-outlined text-[18px]"
                                            >delete</span
                                        >
                                    </button>
                                </td>
                            {/if}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {:else}
        <div
            class="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 dark:border-border-dark rounded-lg"
        >
            No URL parameters defined.
        </div>
    {/if}

    {#if !isReadOnly}
        <button
            onclick={addItem}
            class="self-start px-3 py-1.5 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1"
        >
            <span class="material-symbols-outlined text-[16px]">add</span>
            Add URL Parameter
        </button>
    {/if}
</div>
