<script lang="ts">
    import { ChevronDown } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";

    export let value: string = "";
    export let options: string[] = [];
    export let placeholder: string = "";
    export let disabled: boolean = false;

    let isOpen = false;
    let inputRef: HTMLInputElement;

    const dispatch = createEventDispatcher();

    function toggleDropdown() {
        if (!disabled) {
            isOpen = !isOpen;
        }
    }

    function selectOption(option: string) {
        value = option;
        isOpen = false;
        dispatch("change", { value });
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        value = target.value;
        dispatch("change", { value });
    }

    // Close dropdown when clicking outside
    function clickOutside(node: HTMLElement) {
        const handleClick = (event: MouseEvent) => {
            if (node && !node.contains(event.target as Node) && isOpen) {
                isOpen = false;
            }
        };

        document.addEventListener("click", handleClick, true);

        return {
            destroy() {
                document.removeEventListener("click", handleClick, true);
            },
        };
    }
</script>

<div class="relative w-full" use:clickOutside>
    <div class="relative flex items-center">
        <input
            type="text"
            class="w-full px-3 py-2 border rounded-md outline-none text-blue-900 placeholder:text-gray-400
        focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-gray-100 disabled:text-gray-500
        border-blue-500 pr-10"
            {placeholder}
            {disabled}
            bind:this={inputRef}
            bind:value
            on:input={handleInput}
            on:focus={() => (isOpen = true)}
        />
        <button
            type="button"
            class="absolute right-2 text-blue-500 p-1 hover:bg-blue-50 rounded"
            {disabled}
            on:click={toggleDropdown}
        >
            <ChevronDown size={20} />
        </button>
    </div>

    {#if isOpen && options.length > 0}
        <div
            class="absolute z-10 w-full mt-1 bg-white border border-blue-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
            {#each options as option}
                <button
                    class="w-full text-left px-3 py-2 text-blue-800 hover:bg-blue-50 transition-colors"
                    on:click={() => selectOption(option)}
                >
                    {option}
                </button>
            {/each}
        </div>
    {/if}
</div>
