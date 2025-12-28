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
    class="px-3 py-2 border-2 rounded-md outline-none text-slate-900 placeholder:text-slate-400
    focus:ring-2 focus:ring-blue-600 focus:border-blue-600
    disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200
    border-blue-600
    {className}"
    {placeholder}
    {disabled}
    bind:value
    on:input
/>
