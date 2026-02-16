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
                        <th class="px-6 py-3 font-medium w-56">NAME</th>
                        <th class="px-3 py-3 w-32"><!-- TYPE Spacer --></th>
                        <th class="px-3 py-3 font-medium w-20 text-center"
                            >LEN</th
                        >
                        <th class="px-3 py-3 font-medium text-center w-16"
                            >REQ</th
                        >
                        <th class="px-3 py-3 font-medium text-center w-16"
                            >ENC</th
                        >
                        <th class="px-3 py-3 font-medium text-center w-16"
                            >URLENC</th
                        >
                        <th class="px-3 py-3 w-16"><!-- SIGN Spacer --></th>
                        <th class="px-6 py-3 font-medium">DESCRIPTION</th>
                        {#if !isReadOnly}
                            <th class="px-3 py-3 font-medium w-32">Action</th>
                        {/if}
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                    {#each items as item, i (i)}
                        <tr
                            class="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                            <td class="px-6 py-3">
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
                                        class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark {isReadOnly
                                            ? 'bg-slate-50'
                                            : 'bg-white'} dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                                    />
                                {/if}
                            </td>
                            <td class="px-3 py-3 w-32">
                                <!-- TYPE Spacer -->
                            </td>
                            <td class="px-3 py-3 text-center">
                                {#if isReadOnly}
                                    <span
                                        class="text-xs text-slate-600 dark:text-slate-400"
                                    >
                                        {item.maxLength || "-"}
                                    </span>
                                {:else}
                                    <input
                                        type="text"
                                        bind:value={item.maxLength}
                                        placeholder="Len"
                                        class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none text-center"
                                    />
                                {/if}
                            </td>
                            <td class="px-3 py-3 text-center">
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
                            <td class="px-3 py-3 text-center">
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
                            <td class="px-3 py-3 text-center">
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
                            <td class="px-3 py-3 w-16">
                                <!-- SIGN Spacer -->
                            </td>
                            <td
                                class="px-6 py-3 text-slate-500 dark:text-slate-400"
                            >
                                {#if isReadOnly}
                                    <span
                                        class="text-sm text-slate-600 dark:text-slate-400"
                                    >
                                        {item.description || "-"}
                                    </span>
                                {:else}
                                    <input
                                        type="text"
                                        bind:value={item.description}
                                        placeholder="Description"
                                        class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                                    />
                                {/if}
                            </td>
                            {#if !isReadOnly}
                                <td class="px-3 py-3 text-center">
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
