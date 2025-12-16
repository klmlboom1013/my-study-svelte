<script lang="ts">
    import { ChevronDown } from "lucide-svelte";
    import { fade } from "svelte/transition";

    interface Props {
        value: string;
        options: string[];
        placeholder?: string;
    }

    let {
        value = $bindable(),
        options = [],
        placeholder = "",
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
            bind:value
            {placeholder}
            class="w-full border-2 border-blue-500 rounded-md py-2 pl-3 pr-10 text-base text-black font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            onclick={() => (isOpen = true)}
        />
        <button
            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-500 hover:text-blue-700 cursor-pointer"
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
            class="absolute z-10 w-full mt-1 bg-white border-2 border-blue-500 rounded-md shadow-lg max-h-60 overflow-auto"
            transition:fade={{ duration: 100 }}
        >
            {#if filteredOptions.length > 0}
                {#each filteredOptions as option}
                    <li
                        class="px-3 py-2 cursor-pointer hover:bg-blue-50 text-black font-medium transition-colors"
                        onmousedown={() => select(option)}
                    >
                        {option}
                    </li>
                {/each}
            {:else}
                <li class="px-3 py-2 text-gray-400 font-medium">
                    No matches found
                </li>
            {/if}
        </ul>
    {/if}
</div>
