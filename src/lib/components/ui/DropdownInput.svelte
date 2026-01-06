<script lang="ts">
    import { ChevronDown, X } from "lucide-svelte";
    import { fade } from "svelte/transition";

    interface Props {
        value: string;
        options: string[];
        placeholder?: string;
        id?: string;
        isError?: boolean;
        disabled?: boolean;
    }

    let {
        value = $bindable(),
        options = [],
        placeholder = "",
        id = undefined,
        isError = false,
        disabled = false,
    }: Props = $props();

    let isOpen = $state(false);
    let isFocused = $state(false); // Track focus state
    let containerRef: HTMLDivElement;

    function toggle() {
        if (disabled) return;
        isOpen = !isOpen;
        if (isOpen) isFocused = true; // Ensure logic consistency
    }

    function select(option: string) {
        value = option;
        isOpen = false;
        isFocused = false; // Optional: blur after select? Or keep focus?
    }

    function clear(e: Event) {
        e.stopPropagation(); // Prevent toggling dropdown
        value = "";
        // Keep focus
        const input = containerRef.querySelector("input");
        input?.focus();
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
    <div class="relative group">
        <input
            type="text"
            {id}
            autocomplete="off"
            bind:value
            {placeholder}
            {disabled}
            class={`w-full h-11 pl-4 pr-10 rounded-lg border text-sm outline-none transition-shadow ${
                disabled
                    ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            } ${
                !disabled && isError
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : !disabled
                      ? "border-slate-300 dark:border-slate-600 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
                      : ""
            }`}
            onclick={() => !disabled && (isOpen = true)}
            onfocus={() => (isFocused = true)}
            onblur={() => {
                // Delay to allow clear button click to register
                setTimeout(() => {
                    isFocused = false;
                }, 150);
            }}
        />
        {#if value && !disabled && (isFocused || isOpen)}
            <button
                class="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors z-10"
                type="button"
                onmousedown={(e) => e.preventDefault()}
                onclick={clear}
                tabindex="-1"
                aria-label="Clear input"
            >
                <X size={18} />
            </button>
        {:else}
            <button
                class="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-slate-300 dark:text-slate-600 pointer-events-none"
                type="button"
                tabindex="-1"
            >
                <ChevronDown size={24} />
            </button>
        {/if}
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
