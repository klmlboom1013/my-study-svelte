<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let options: { label: string; value: string }[] = [];
    export let value: string = "";
    export let name: string = "";
    export let disabled: boolean = false;

    const dispatch = createEventDispatcher();

    function handleChange(newValue: string) {
        if (!disabled) {
            value = newValue;
            dispatch("change", { value });
        }
    }
</script>

<div class="flex flex-row gap-4">
    {#each options as option}
        <label class="flex items-center gap-2 cursor-pointer">
            <input
                type="radio"
                {name}
                class="w-4 h-4 text-blue-600 bg-gray-100 border-2 border-blue-500 focus:ring-blue-500 disabled:text-gray-400"
                checked={value === option.value}
                {disabled}
                on:change={() => handleChange(option.value)}
            />
            <span
                class="text-black font-medium text-base {disabled
                    ? 'text-gray-400'
                    : ''}"
            >
                {option.label}
            </span>
        </label>
    {/each}
</div>
