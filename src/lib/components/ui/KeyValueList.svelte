<script lang="ts">
    import { flip } from "svelte/animate";
    import { fade } from "svelte/transition";

    interface KeyValueItem {
        key: string;
        value: string;
    }

    interface Props {
        items: KeyValueItem[];
        keyPlaceholder?: string;
        valuePlaceholder?: string;
        addButtonText?: string;
        isReadOnly?: boolean;
    }

    let {
        items = $bindable([]),
        keyPlaceholder = "Key",
        valuePlaceholder = "Value",
        addButtonText = "Add Item",
        isReadOnly = false,
    }: Props = $props();

    function addItem() {
        items = [...items, { key: "", value: "" }];
    }

    function removeItem(index: number) {
        items = items.filter((_, i) => i !== index);
    }
</script>

<div class="flex flex-col gap-3">
    {#each items as item, i (i)}
        <div
            class="flex gap-2 items-center"
            animate:flip={{ duration: 200 }}
            transition:fade={{ duration: 150 }}
        >
            <input
                type="text"
                placeholder={keyPlaceholder}
                bind:value={item.key}
                class="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                disabled={isReadOnly}
            />
            <input
                type="text"
                placeholder={valuePlaceholder}
                bind:value={item.value}
                class="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                disabled={isReadOnly}
            />
            {#if !isReadOnly}
                <button
                    onclick={() => removeItem(i)}
                    class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove Item"
                >
                    <span class="material-symbols-outlined text-[20px]"
                        >delete</span
                    >
                </button>
            {/if}
        </div>
    {/each}
    {#if !isReadOnly}
        <button
            onclick={addItem}
            class="self-start px-3 py-1.5 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1"
        >
            <span class="material-symbols-outlined text-[16px]">add</span>
            {addButtonText}
        </button>
    {/if}
</div>
