<script lang="ts">
    type Option = string | { value: string; label: string };

    interface Props {
        options: Option[];
        groupName: string;
        selected: string;
        direction?: "row" | "column" | "grid";
        onOptionClick?: (value: string) => void;
        isError?: boolean;
        variant?: "default" | "box"; // default is now circle, box is card-like
        cols?: number; // for grid layout
    }

    let {
        options,
        groupName,
        selected = $bindable(),
        direction = "row",
        onOptionClick,
        isError = false,
        variant = "box", // Default to box as it is used more often in the new markup
        cols = 3,
    }: Props = $props();

    function getOptionValue(option: Option): string {
        return typeof option === "string" ? option : option.value;
    }

    function getOptionLabel(option: Option): string {
        return typeof option === "string" ? option : option.label;
    }

    let containerClass = $derived.by(() => {
        if (direction === "grid") {
            const gridCols: Record<number, string> = {
                1: "grid-cols-1",
                2: "grid-cols-2",
                3: "grid-cols-3",
                4: "grid-cols-4",
            };
            return `grid ${gridCols[cols] || "grid-cols-3"} gap-3`;
        }
        return `flex gap-3 ${direction === "column" ? "flex-col" : "flex-row w-full"}`;
    });
</script>

<div class={containerClass}>
    {#each options as option}
        {@const value = getOptionValue(option)}
        {@const label = getOptionLabel(option)}

        {#if variant === "box"}
            <label class="cursor-pointer relative">
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
                        flex items-center justify-center rounded-lg border transition-all
                        font-medium text-sm h-10
                        ${
                            isError
                                ? "border-red-500 text-red-500"
                                : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 peer-checked:border-primary peer-checked:ring-1 peer-checked:ring-primary peer-checked:bg-primary/5 peer-checked:text-primary"
                        }
                    `}
                >
                    {label}
                </div>
            </label>
        {:else}
            <!-- Default Radio Button style (if needed for other parts, though markup uses mostly boxes or checks) -->
            <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative flex items-center justify-center">
                    <input
                        type="radio"
                        name={groupName}
                        {value}
                        bind:group={selected}
                        onclick={() => onOptionClick?.(value)}
                        class={`peer appearance-none w-5 h-5 border-2 rounded-full cursor-pointer transition-all ${isError ? "border-red-500 checked:bg-red-500" : "border-slate-300 dark:border-slate-600 checked:bg-primary checked:border-primary"}`}
                    />
                    <div
                        class="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                    ></div>
                </div>
                <span
                    class={`font-medium text-sm transition-colors ${isError ? "text-red-500" : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"}`}
                    >{label}</span
                >
            </label>
        {/if}
    {/each}
</div>
