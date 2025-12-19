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
        ? 'bg-ui-inactive text-text-white border-ui-inactive cursor-not-allowed'
        : 'bg-brand-primary text-text-white border-brand-primary hover:bg-brand-hover active:bg-brand-hover'}
    {className}"
    {disabled}
    on:click={handleClick}
>
    <slot />
</button>
