<script lang="ts">
    import { ChevronDown } from "lucide-svelte";
    import { fade } from "svelte/transition";

    interface Props {
        value: string;
        options: string[];
        placeholder?: string;
        id?: string;
        isError?: boolean;
    }

    let {
        value = $bindable(),
        options = [],
        placeholder = "",
        id = undefined,
        isError = false,
    }: Props = $props();

    let isOpen = $state(false);
    let containerRef: HTMLDivElement;

    function toggle() {
        isOpen = !isOpen;
    }

    function select(option: string) {
        value = option;
        isOpen = false;
    }

    function handleOutsideClick(event: MouseEvent) {
        if (
            isOpen &&
            containerRef &&
            !containerRef.contains(event.target as Node)
        ) {
            isOpen = false;
        }
    }
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="relative w-full" bind:this={containerRef}>
    <div class="relative">
        <input
            type="text"
            {id}
            autocomplete="off"
            bind:value
            {placeholder}
            class={`w-full h-11 pl-4 pr-10 rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none transition-shadow ${
                isError
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : "border-slate-300 dark:border-slate-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
            }`}
            onclick={() => (isOpen = true)}
        />
        <button
            class="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-slate-300 dark:text-slate-600 pointer-events-none"
            type="button"
            tabindex="-1"
        >
            <ChevronDown size={24} />
        </button>
    </div>

    {#if isOpen}
        {@const filteredOptions = options.filter((opt) =>
            opt.toLowerCase().includes(value?.toLowerCase() || ""),
        )}
        <ul
            class="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto"
            transition:fade={{ duration: 100 }}
        >
            {#if filteredOptions.length > 0}
                {#each filteredOptions as option}
                    <li
                        role="option"
                        aria-selected={value === option}
                        tabindex="0"
                        class="px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm transition-colors outline-none focus:bg-slate-50 dark:focus:bg-slate-700"
                        onclick={() => select(option)}
                        onkeydown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                                select(option);
                        }}
                    >
                        {option}
                    </li>
                {/each}
            {:else}
                <li class="px-4 py-2 text-slate-400 text-sm">
                    No matches found
                </li>
            {/if}
        </ul>
    {/if}
</div>
