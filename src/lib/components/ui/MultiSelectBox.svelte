<script lang="ts">
    import { ChevronDown, Check } from "lucide-svelte";
    import { fade } from "svelte/transition";

    interface Props {
        value: string[];
        options: string[];
        placeholder?: string;
        id?: string;
        isError?: boolean;
        disabled?: boolean;
    }

    let {
        value = $bindable([]),
        options = [],
        placeholder = "Select options",
        id = undefined,
        isError = false,
        disabled = false,
    }: Props = $props();

    let isOpen = $state(false);
    let containerRef: HTMLDivElement;

    function toggle() {
        if (disabled) return;
        isOpen = !isOpen;
    }

    function toggleOption(option: string) {
        if (value.includes(option)) {
            value = value.filter((v) => v !== option);
        } else {
            value = [...value, option];
        }
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

    let displayText = $derived(
        value.length > 0 ? `${value.length} selected` : placeholder,
    );

    // If value length is small, show them?
    // Usually "X selected" is better for multi.
    // Or if < 3 join with comma.
    let displayLabel = $derived.by(() => {
        if (value.length === 0) return placeholder;
        if (value.length <= 2) return value.join(", ");
        return `${value.length} selected`;
    });
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="relative w-full" bind:this={containerRef}>
    <div class="relative">
        <button
            type="button"
            {id}
            onclick={toggle}
            {disabled}
            class={`w-full h-9 pl-4 pr-10 text-left rounded-lg border text-sm outline-none transition-shadow flex items-center ${
                disabled
                    ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 cursor-not-allowed"
                    : "bg-slate-50 dark:bg-card-dark text-slate-900 dark:text-white cursor-pointer"
            } ${
                !disabled && isError
                    ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    : !disabled
                      ? "border-slate-200 dark:border-border-dark focus:border-primary/50 focus:ring-0"
                      : ""
            }`}
        >
            <span
                class:text-slate-400={value.length === 0}
                class:dark:text-slate-500={value.length === 0}
                class="truncate"
            >
                {displayLabel}
            </span>
        </button>
        <div
            class="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-slate-300 dark:text-slate-600 pointer-events-none"
        >
            <ChevronDown size={24} />
        </div>
    </div>

    {#if isOpen}
        <ul
            class="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto"
            transition:fade={{ duration: 100 }}
        >
            {#if options.length > 0}
                {#each options as option}
                    <li
                        role="option"
                        aria-selected={value.includes(option)}
                        tabindex="0"
                        class="px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm transition-colors outline-none focus:bg-slate-50 dark:focus:bg-slate-700 flex items-center gap-2"
                        onclick={(e) => {
                            e.stopPropagation();
                            toggleOption(option);
                        }}
                        onkeydown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleOption(option);
                            }
                        }}
                    >
                        <div
                            class={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${value.includes(option) ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-500"}`}
                        >
                            {#if value.includes(option)}
                                <Check size={12} class="text-white" />
                            {/if}
                        </div>
                        {option}
                    </li>
                {/each}
            {:else}
                <li class="px-4 py-2 text-slate-400 text-sm">
                    No options available
                </li>
            {/if}
        </ul>
    {/if}
</div>
