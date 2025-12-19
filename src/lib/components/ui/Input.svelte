<script lang="ts">
    export let value: string | number = "";
    export let type: "text" | "number" = "text";
    export let placeholder: string = "";
    export let disabled: boolean = false;
    export let className: string = "";

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        value = type === "number" ? Number(target.value) : target.value;
    }
</script>

<input
    {type}
    class="px-3 py-2 border-2 rounded-md outline-none text-brand-primary placeholder:text-ui-hint
    focus:ring-2 focus:ring-brand-primary focus:border-brand-primary
    disabled:bg-ui-inactive disabled:text-text-white disabled:border-ui-inactive
    border-brand-primary
    {className}"
    {placeholder}
    {disabled}
    bind:value
    on:input
/>
