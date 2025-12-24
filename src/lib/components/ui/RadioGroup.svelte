<script lang="ts">
    type Option = string | { value: string; label: string };

    interface Props {
        options: Option[];
        groupName: string;
        selected: string;
        direction?: "row" | "column";
        onOptionClick?: (value: string) => void;
        isError?: boolean;
        variant?: "default" | "box";
    }

    let {
        options,
        groupName,
        selected = $bindable(),
        direction = "row",
        onOptionClick,
        isError = false,
        variant = "default",
    }: Props = $props();

    function getOptionValue(option: Option): string {
        return typeof option === "string" ? option : option.value;
    }

    function getOptionLabel(option: Option): string {
        return typeof option === "string" ? option : option.label;
    }
</script>

<div
    class={`flex gap-4 ${direction === "column" ? "flex-col" : "flex-row w-full"}`}
>
    {#each options as option}
        {@const value = getOptionValue(option)}
        {@const label = getOptionLabel(option)}

        {#if variant === "box"}
            <label class="cursor-pointer group relative flex-1 text-center">
                <input
                    type="radio"
                    name={groupName}
                    {value}
                    bind:group={selected}
                    onclick={() => onOptionClick?.(value)}
                    class="peer sr-only"
                />
                <div
                    class={`
                        flex items-center justify-center px-4 py-2 
                        border-2 rounded-lg transition-all
                        text-sm font-medium w-full
                        ${
                            isError
                                ? "border-red-500 text-red-500"
                                : "border-brand-primary text-gray-700 peer-checked:bg-brand-primary peer-checked:text-white hover:bg-gray-50 peer-checked:hover:bg-brand-hover"
                        }
                    `}
                >
                    {label}
                </div>
            </label>
        {:else}
            <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                    <input
                        type="radio"
                        name={groupName}
                        {value}
                        bind:group={selected}
                        onclick={() => onOptionClick?.(value)}
                        class={`peer appearance-none w-5 h-5 border-2 rounded-full cursor-pointer transition-all ${isError ? "border-red-500 checked:bg-red-500" : "border-brand-primary checked:bg-brand-primary"}`}
                    />
                    <div
                        class="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                    ></div>
                </div>
                <span
                    class={`font-medium text-base transition-colors ${isError ? "text-red-500" : "text-brand-primary group-hover:text-brand-hover"}`}
                    >{label}</span
                >
            </label>
        {/if}
    {/each}
</div>
