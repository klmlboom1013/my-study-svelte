<script lang="ts">
    interface Props {
        options: string[];
        groupName: string;
        selected: string;
        direction?: "row" | "column";
    }

    let {
        options,
        groupName,
        selected = $bindable(),
        direction = "row",
    }: Props = $props();
</script>

<div class={`flex gap-4 ${direction === "column" ? "flex-col" : "flex-row"}`}>
    {#each options as option}
        <label class="flex items-center gap-2 cursor-pointer group">
            <div class="relative flex items-center justify-center">
                <input
                    type="radio"
                    name={groupName}
                    value={option}
                    bind:group={selected}
                    class="peer appearance-none w-5 h-5 border-2 border-blue-500 rounded-full cursor-pointer checked:bg-blue-500 transition-all"
                />
                <div
                    class="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                ></div>
            </div>
            <span
                class="text-blue-600 font-medium text-base group-hover:text-blue-800 transition-colors"
                >{option}</span
            >
        </label>
    {/each}
</div>
