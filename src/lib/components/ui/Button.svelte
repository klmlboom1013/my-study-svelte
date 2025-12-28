<script lang="ts">
    export let type: "button" | "submit" | "reset" = "button";
    export let disabled: boolean = false;
    export let className: string = "";
    export let onClick: (() => void) | undefined = undefined;

    function handleClick() {
        if (!disabled && onClick) {
            onClick();
        }
    }
</script>

<button
    {type}
    class="px-4 py-2 rounded-md font-medium transition-colors border-2
    {disabled
        ? 'bg-slate-200 text-slate-500 border-slate-200 cursor-not-allowed'
        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 active:bg-blue-700'}
    {className}"
    {disabled}
    on:click={handleClick}
>
    <slot />
</button>
