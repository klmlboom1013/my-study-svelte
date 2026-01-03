<script lang="ts">
    import Modal from "$lib/components/ui/Modal.svelte";
    import { Code, AlertCircle } from "lucide-svelte";
    import type { RequestDataField } from "$lib/types/endpoint";

    let {
        isOpen = $bindable(false),
        requestData = $bindable([] as RequestDataField[]),
    } = $props();

    let jsonString = $state("");
    let error = $state("");

    // Initialize JSON string when modal opens
    $effect(() => {
        if (isOpen) {
            jsonString = JSON.stringify(requestData, null, 2);
            error = "";
        }
    });

    function handleSave() {
        try {
            const parsed = JSON.parse(jsonString);

            // Validate schema
            if (!Array.isArray(parsed)) {
                throw new Error("JSON must be an array of fields.");
            }

            // Basic validation for each item
            for (let i = 0; i < parsed.length; i++) {
                const item = parsed[i];
                if (!item.name || typeof item.name !== "string") {
                    throw new Error(
                        `Item at index ${i} is missing name or name is not a string.`,
                    );
                }
                if (
                    !item.type ||
                    !["string", "number", "boolean"].includes(item.type)
                ) {
                    throw new Error(
                        `Item at index ${i} has invalid type. Must be string, number, or boolean.`,
                    );
                }
                // Check boolean fields
                if (
                    item.required !== undefined &&
                    typeof item.required !== "boolean"
                ) {
                    throw new Error(
                        `Item at index ${i} 'required' must be boolean.`,
                    );
                }
                if (
                    item.encrypt !== undefined &&
                    typeof item.encrypt !== "boolean"
                ) {
                    throw new Error(
                        `Item at index ${i} 'encrypt' must be boolean.`,
                    );
                }
                if (
                    item.encoded !== undefined &&
                    typeof item.encoded !== "boolean"
                ) {
                    throw new Error(
                        `Item at index ${i} 'encoded' must be boolean.`,
                    );
                }
            }

            // Update request data with validated input
            // Ensure optional fields are handled if missing in JSON but required by type?
            // The type has optional fields, so it's fine.
            requestData = parsed as RequestDataField[];
            isOpen = false;
        } catch (e: any) {
            error = e.message || "Invalid JSON format";
        }
    }
</script>

<Modal bind:isOpen title="Edit Request Data JSON" width="max-w-3xl">
    <div class="flex flex-col gap-4">
        <div
            class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex items-start gap-2"
        >
            <Code
                class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
            />
            <div class="text-sm text-blue-700 dark:text-blue-300">
                <p class="font-semibold mb-1">JSON Format Guide</p>
                <p>Edit the array directly. Each object represents a field.</p>
                <p>
                    Required keys: <code>name</code>, <code>type</code> ("string"
                    | "number" | "boolean").
                </p>
            </div>
        </div>

        <div class="relative">
            <textarea
                bind:value={jsonString}
                class="w-full h-96 p-4 font-mono text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                placeholder="Paste your JSON here..."
            ></textarea>
        </div>

        {#if error}
            <div
                class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-1"
            >
                <AlertCircle class="w-4 h-4" />
                <span>{error}</span>
            </div>
        {/if}

        <div class="flex justify-end gap-2 pt-2">
            <button
                onclick={() => (isOpen = false)}
                class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button
                onclick={handleSave}
                class="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm shadow-primary/20 transition-all"
            >
                Apply Changes
            </button>
        </div>
    </div>
</Modal>
