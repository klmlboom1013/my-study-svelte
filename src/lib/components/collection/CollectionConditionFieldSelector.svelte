<script lang="ts">
    import type { Endpoint, ResponseDataField } from "$lib/types/endpoint";
    import { List } from "lucide-svelte";

    interface Props {
        endpoint: Endpoint | undefined;
        value: string;
        onUpdate: (newValue: string) => void;
    }

    let { endpoint, value, onUpdate }: Props = $props();

    let isCustom = $state(false);
    let options = $state<{ value: string; label: string; type: string }[]>([]);

    function flattenFields(
        fields: ResponseDataField[],
        prefix = "",
    ): { value: string; label: string; type: string }[] {
        let result: { value: string; label: string; type: string }[] = [];
        for (const field of fields) {
            const currentPath = prefix ? `${prefix}.${field.name}` : field.name;
            result.push({
                value: currentPath,
                label: currentPath,
                type: field.type,
            });
            // Recursively add subfields for non-List types
            // If type is List, we stop recursion for the dropdown to avoid confusion (users can use custom field for array indexing)
            if (field.subFields && field.type !== "List") {
                result = [
                    ...result,
                    ...flattenFields(field.subFields, currentPath),
                ];
            }
        }
        return result;
    }

    $effect(() => {
        if (endpoint?.responseData) {
            options = flattenFields(endpoint.responseData);
        } else {
            options = [];
        }
    });

    // Auto-detect custom mode if value is not in options (and not empty)
    $effect(() => {
        if (
            value &&
            options.length > 0 &&
            !options.some((o) => o.value === value)
        ) {
            isCustom = true;
        }
    });

    function handleSelectChange(e: Event) {
        const selected = (e.target as HTMLSelectElement).value;
        if (selected === "__custom__") {
            isCustom = true;
            onUpdate(""); // Reset for manual input
        } else {
            isCustom = false;
            onUpdate(selected);
        }
    }

    function toggleMode() {
        isCustom = !isCustom;
        if (isCustom) {
            onUpdate("");
        }
    }
</script>

<div class="relative w-full">
    {#if !isCustom && options.length > 0}
        <select
            class="w-full px-2 py-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white appearance-none"
            {value}
            onchange={handleSelectChange}
        >
            <option value="">Select Field</option>
            {#each options as opt}
                <option value={opt.value}>
                    {opt.label} ({opt.type})
                </option>
            {/each}
            <option value="__custom__" class="font-bold text-blue-500"
                >Custom Field...</option
            >
        </select>
    {:else}
        <div class="flex gap-1">
            <input
                type="text"
                class="flex-1 px-2 py-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                placeholder="e.g. data.user.id"
                {value}
                oninput={(e) => onUpdate((e.target as HTMLInputElement).value)}
            />
            {#if options.length > 0}
                <button
                    onclick={toggleMode}
                    class="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                    title="Select from list"
                >
                    <List size={14} />
                </button>
            {/if}
        </div>
    {/if}
</div>
