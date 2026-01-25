<script lang="ts">
    import { ChevronDown, Plus, Trash2, Check } from "lucide-svelte";
    import { slide, fade } from "svelte/transition";
    import type { RequestDataField } from "$lib/types/endpoint";

    let {
        fields,
        values = $bindable(),
        onUserChange,
        getOptions,
        activeDropdownPath = $bindable(),
    } = $props();

    function initializeValues(
        fields: RequestDataField[] = [],
    ): Record<string, any> {
        const result: Record<string, any> = {};
        fields.forEach((field) => {
            if (field.subFields) {
                if (field.type === "List") {
                    result[field.name] = [];
                } else {
                    result[field.name] = initializeValues(field.subFields);
                }
            } else {
                result[field.name] = field.defaultValue || "";
            }
        });
        return result;
    }

    function addListItem(
        fieldName: string,
        subFields?: RequestDataField[],
        currentValues: any = values,
    ) {
        if (!currentValues[fieldName]) currentValues[fieldName] = [];
        currentValues[fieldName] = [
            ...currentValues[fieldName],
            initializeValues(subFields),
        ];
        onUserChange();
    }

    function removeListItem(
        fieldName: string,
        index: number,
        currentValues: any = values,
    ) {
        currentValues[fieldName] = currentValues[fieldName].filter(
            (_: any, i: number) => i !== index,
        );
        onUserChange();
    }
</script>

{#snippet renderFieldSnippet(
    field: RequestDataField,
    currentValues: any,
    path: string,
    level: number = 0,
)}
    {#if level > 10}
        <div
            class="text-red-500 text-xs p-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded"
        >
            Max recursion depth exceeded
        </div>
    {:else}
        <div
            class="grid grid-cols-[90px_1fr] md:grid-cols-3 border-b border-slate-200 dark:border-border-dark last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        >
            <!-- Name Column -->
            <div
                class="p-2 md:p-4 align-top md:border-r border-slate-100 dark:border-border-dark/50"
            >
                <div
                    class="flex flex-col gap-1"
                    style="padding-left: {level * 0.5}rem;"
                >
                    <div class="flex items-center gap-0.5 flex-wrap">
                        <label
                            for={path}
                            class="font-semibold text-xs text-slate-700 dark:text-slate-200 break-all"
                        >
                            {field.name}
                        </label>
                        {#if field.required}
                            <span class="text-red-500 font-bold">*</span>
                        {/if}
                    </div>
                    <div
                        class="hidden md:block text-xs text-slate-500 dark:text-slate-400 font-mono"
                    >
                        {field.type}
                    </div>
                    {#if field.description}
                        <div
                            class="hidden md:block text-xs text-slate-500 mt-1 leading-relaxed"
                        >
                            {field.description}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Value Column -->
            <div class="p-2 md:p-4 align-top md:col-span-2">
                {#if field.type === "List"}
                    <div class="flex flex-col gap-3">
                        {#if currentValues[field.name] && Array.isArray(currentValues[field.name])}
                            {#each currentValues[field.name] as item, index}
                                <div
                                    class="relative border border-slate-200 dark:border-border-dark rounded-lg overflow-hidden"
                                >
                                    <div
                                        class="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-200 dark:border-border-dark flex justify-between items-center"
                                    >
                                        <span
                                            class="text-xs font-semibold text-slate-500"
                                            >Item {index + 1}</span
                                        >
                                        <button
                                            onclick={() =>
                                                removeListItem(
                                                    field.name,
                                                    index,
                                                    currentValues,
                                                )}
                                            class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove Item"
                                        >
                                            <Trash2 class="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div
                                        class="bg-white dark:bg-slate-950 flex flex-col"
                                    >
                                        {#each field.subFields || [] as subField}
                                            {@render renderFieldSnippet(
                                                subField,
                                                item,
                                                `${path}[${index}].${subField.name}`,
                                                level + 1,
                                            )}
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        {/if}
                        <button
                            onclick={() =>
                                addListItem(
                                    field.name,
                                    field.subFields,
                                    currentValues,
                                )}
                            class="flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors border-dashed w-full"
                        >
                            <Plus class="w-4 h-4" />
                            Add Item
                        </button>
                    </div>
                {:else if field.type === "boolean"}
                    <select
                        id={path}
                        bind:value={currentValues[field.name]}
                        onchange={onUserChange}
                        class="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    >
                        <option value={true}>true</option>
                        <option value={false}>false</option>
                    </select>
                {:else}
                    {@const options = getOptions(field)}
                    {#if options.length > 0}
                        <div class="relative w-full param-dropdown-container">
                            <input
                                id={path}
                                type={field.type === "number"
                                    ? "number"
                                    : "text"}
                                bind:value={currentValues[field.name]}
                                oninput={onUserChange}
                                placeholder={field.description ||
                                    `Enter ${field.name}`}
                                onfocus={() => (activeDropdownPath = path)}
                                class="w-full pl-3 pr-10 py-2 text-sm font-normal rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                            />
                            <button
                                type="button"
                                class="absolute right-0 top-0 bottom-0 px-3 text-slate-400 hover:text-primary transition-colors flex items-center"
                                onclick={() =>
                                    (activeDropdownPath =
                                        activeDropdownPath === path
                                            ? null
                                            : path)}
                            >
                                <ChevronDown
                                    size={14}
                                    class="transition-transform duration-200 {activeDropdownPath ===
                                    path
                                        ? 'rotate-180'
                                        : ''}"
                                />
                            </button>

                            {#if activeDropdownPath === path}
                                <div
                                    transition:fade={{ duration: 200 }}
                                    class="absolute right-0 top-full mt-1 z-50 w-full min-w-[200px] max-h-[200px] overflow-y-auto rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-900 shadow-xl"
                                >
                                    {#each options as opt}
                                        <button
                                            type="button"
                                            class="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
                                            onclick={() => {
                                                currentValues[field.name] =
                                                    opt.value;
                                                activeDropdownPath = null;
                                                onUserChange();
                                            }}
                                        >
                                            <div class="flex flex-col gap-0.5">
                                                <span
                                                    class="font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-primary transition-colors"
                                                    >{opt.value}</span
                                                >
                                                <span
                                                    class="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]"
                                                >
                                                    {opt.source}
                                                    {opt.source === "Option"
                                                        ? `• ${opt.label.split("(")[1].replace(")", "")}`
                                                        : ""}
                                                </span>
                                            </div>
                                            {#if currentValues[field.name] === opt.value}
                                                <Check
                                                    size={14}
                                                    class="text-primary"
                                                />
                                            {/if}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <input
                            id={path}
                            type={field.type === "number" ? "number" : "text"}
                            bind:value={currentValues[field.name]}
                            oninput={onUserChange}
                            placeholder={field.description ||
                                `Enter ${field.name}`}
                            class="w-full px-3 py-2 text-sm font-normal rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                        />
                    {/if}
                {/if}
            </div>
        </div>
    {/if}
{/snippet}

<div class="flex flex-col">
    {#each fields as field}
        {@render renderFieldSnippet(field, values, field.name, 0)}
    {/each}
</div>
