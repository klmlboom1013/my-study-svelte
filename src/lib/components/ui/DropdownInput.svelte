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
            class={`w-full border-2 rounded-md py-2 pl-3 pr-10 text-base font-medium placeholder-ui-hint focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all ${isError ? "border-red-500" : "border-brand-primary"}`}
            class:text-brand-primary={true}
            onclick={() => (isOpen = true)}
        />
        <button
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-primary hover:text-brand-hover cursor-pointer"
            onclick={toggle}
            aria-label="Toggle options"
            type="button"
        >
            <ChevronDown size={20} />
        </button>
    </div>

    {#if isOpen}
        {@const filteredOptions = options.filter((opt) =>
            opt.toLowerCase().includes(value?.toLowerCase() || ""),
        )}
        <ul
            class="absolute z-10 w-full mt-1 bg-white border-2 border-brand-primary rounded-md shadow-lg max-h-60 overflow-auto"
            transition:fade={{ duration: 100 }}
        >
            {#if filteredOptions.length > 0}
                {#each filteredOptions as option}
                    <li
                        role="option"
                        aria-selected={value === option}
                        tabindex="0"
                        class="px-3 py-2 cursor-pointer hover:bg-brand-primary/10 text-brand-primary font-medium transition-colors outline-none focus:bg-brand-primary/10"
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
                <li class="px-3 py-2 text-ui-hint font-medium">
                    No matches found
                </li>
            {/if}
        </ul>
    {/if}
</div>
