<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { clickOutside } from "$lib/utils/clickOutside";

    let { value = $bindable() } = $props();

    let isOpen = $state(false);

    const types = [
        {
            value: "string",
            label: "S",
            color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            desc: "String",
        },
        {
            value: "number",
            label: "N",
            color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            desc: "Number",
        },
        {
            value: "boolean",
            label: "B",
            color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
            desc: "Boolean",
        },
    ];

    let selectedType = $derived(
        types.find((t) => t.value === value) || types[0],
    );

    function select(type: string) {
        value = type;
        isOpen = false;
    }
</script>

<div
    class="relative inline-block w-full"
    use:clickOutside={() => (isOpen = false)}
>
    <button
        onclick={() => (isOpen = !isOpen)}
        class="w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
        title={selectedType.desc}
    >
        <div
            class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold {selectedType.color}"
        >
            {selectedType.label}
        </div>
        <span class="sr-only">{selectedType.desc}</span>
    </button>

    {#if isOpen}
        <div
            class="absolute top-full left-0 z-10 mt-1 w-full min-w-[100px] bg-white dark:bg-card-dark rounded-lg shadow-lg border border-slate-100 dark:border-border-dark py-1 overflow-hidden"
            transition:scale={{ duration: 150, start: 0.95 }}
        >
            {#each types as type}
                <button
                    onclick={() => select(type.value)}
                    class="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                >
                    <div
                        class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold {type.color}"
                    >
                        {type.label}
                    </div>
                    <span class="text-slate-700 dark:text-slate-300 font-medium"
                        >{type.desc}</span
                    >
                </button>
            {/each}
        </div>
    {/if}
</div>
