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
    class="px-3 py-2 border-2 rounded-md outline-none text-black placeholder:text-gray-400
    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200
    border-blue-500
    {className}"
    {placeholder}
    {disabled}
    bind:value
    on:input
/>
