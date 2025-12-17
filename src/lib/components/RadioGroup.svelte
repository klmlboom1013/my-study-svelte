<script lang="ts">
    type Option = string | { value: string; label: string };

    interface Props {
        options: Option[];
        groupName: string;
        selected: string;
        direction?: "row" | "column";
        onOptionClick?: (value: string) => void;
    }

    let {
        options,
        groupName,
        selected = $bindable(),
        direction = "row",
        onOptionClick,
    }: Props = $props();

    function getOptionValue(option: Option): string {
        return typeof option === "string" ? option : option.value;
    }

    function getOptionLabel(option: Option): string {
        return typeof option === "string" ? option : option.label;
    }
</script>

<div class={`flex gap-4 ${direction === "column" ? "flex-col" : "flex-row"}`}>
    {#each options as option}
        {@const value = getOptionValue(option)}
        {@const label = getOptionLabel(option)}
        <label class="flex items-center gap-2 cursor-pointer group">
            <div class="relative flex items-center justify-center">
                <input
                    type="radio"
                    name={groupName}
                    {value}
                    bind:group={selected}
                    onclick={() => onOptionClick?.(value)}
                    class="peer appearance-none w-5 h-5 border-2 border-[oklch(0.36_0.11_265.06)] rounded-full cursor-pointer checked:bg-[oklch(0.36_0.11_265.06)] transition-all"
                />
                <div
                    class="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                ></div>
            </div>
            <span
                class="text-[oklch(0.36_0.11_265.06)] font-medium text-base group-hover:text-[oklch(0.49_0.23_262.62)] transition-colors"
                >{label}</span
            >
        </label>
    {/each}
</div>
