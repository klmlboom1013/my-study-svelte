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
        ? 'bg-gray-400 text-white border-gray-400 cursor-not-allowed'
        : 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600 active:bg-blue-700'}
    {className}"
    {disabled}
    on:click={handleClick}
>
    <slot />
</button>
