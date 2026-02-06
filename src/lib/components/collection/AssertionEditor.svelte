<script lang="ts">
    import type { Assertion, CollectionStep } from "$lib/stores/settingsStore";

    interface Props {
        step: CollectionStep;
        onUpdate: (updatedStep: CollectionStep) => void;
    }

    let { step, onUpdate }: Props = $props();

    function addAssertion() {
        const assertions = [...(step.assertions || [])];
        assertions.push({
            id: crypto.randomUUID(),
            enabled: true,
            type: "STATUS_CODE",
            operator: "equals",
            value: "200",
        });
        onUpdate({ ...step, assertions });
    }

    function removeAssertion(id: string) {
        const assertions = (step.assertions || []).filter((a) => a.id !== id);
        onUpdate({ ...step, assertions });
    }

    function updateAssertion(id: string, updates: Partial<Assertion>) {
        const assertions = (step.assertions || []).map((a) =>
            a.id === id ? { ...a, ...updates } : a,
        );
        onUpdate({ ...step, assertions });
    }
</script>

<div class="mt-8 space-y-4">
    <div
        class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-800"
    >
        <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]"
                >verified</span
            >
            <h4
                class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
            >
                Quality Assertions
            </h4>
        </div>
        <button
            onclick={addAssertion}
            class="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-bold text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
        >
            <span class="material-symbols-outlined text-[16px]">add</span>
            Add Verification
        </button>
    </div>

    {#if (step.assertions || []).length > 0}
        <div class="space-y-2">
            {#each step.assertions || [] as assertion (assertion.id)}
                <div
                    class="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-primary/30"
                >
                    <div class="pt-1.5">
                        <label
                            for="enabled-{assertion.id}"
                            class="relative inline-flex items-center cursor-pointer"
                        >
                            <input
                                id="enabled-{assertion.id}"
                                type="checkbox"
                                checked={assertion.enabled}
                                onchange={(e) =>
                                    updateAssertion(assertion.id, {
                                        enabled: e.currentTarget.checked,
                                    })}
                                class="sr-only peer"
                            />
                            <div
                                class="w-8 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"
                            ></div>
                        </label>
                    </div>

                    <div class="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <!-- Type Select -->
                        <div class="space-y-1">
                            <label
                                for="type-{assertion.id}"
                                class="block text-[10px] font-bold text-slate-400 uppercase"
                                >Type</label
                            >
                            <select
                                id="type-{assertion.id}"
                                value={assertion.type}
                                onchange={(e) =>
                                    updateAssertion(assertion.id, {
                                        type: e.currentTarget.value as any,
                                    })}
                                class="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary transition-all font-medium"
                            >
                                <option value="STATUS_CODE">Status Code</option>
                                <option value="JSON_BODY">JSON Body</option>
                                <option value="LATENCY">Latency (ms)</option>
                                <option value="HEADER">Header</option>
                                <option value="REGEXP">RegExp</option>
                            </select>
                        </div>

                        <!-- Field (if applicable) -->
                        <div
                            class="space-y-1 {['JSON_BODY', 'HEADER'].includes(
                                assertion.type,
                            )
                                ? ''
                                : 'opacity-30 pointer-events-none'}"
                        >
                            <label
                                for="field-{assertion.id}"
                                class="block text-[10px] font-bold text-slate-400 uppercase"
                                >Field / Key</label
                            >
                            <input
                                id="field-{assertion.id}"
                                type="text"
                                value={assertion.field || ""}
                                oninput={(e) =>
                                    updateAssertion(assertion.id, {
                                        field: e.currentTarget.value,
                                    })}
                                placeholder={assertion.type === "JSON_BODY"
                                    ? "$.resultCode"
                                    : "Content-Type"}
                                class="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary transition-all font-mono"
                            />
                        </div>

                        <!-- Operator Select -->
                        <div class="space-y-1">
                            <label
                                for="operator-{assertion.id}"
                                class="block text-[10px] font-bold text-slate-400 uppercase"
                                >Operator</label
                            >
                            <select
                                id="operator-{assertion.id}"
                                value={assertion.operator}
                                onchange={(e) =>
                                    updateAssertion(assertion.id, {
                                        operator: e.currentTarget.value as any,
                                    })}
                                class="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary transition-all font-medium"
                            >
                                <option value="equals">Equals</option>
                                <option value="notEquals">Not Equals</option>
                                <option value="contains">Contains</option>
                                <option value="lessThan">Less Than</option>
                                <option value="greaterThan">Greater Than</option
                                >
                                <option value="exists">Exists</option>
                                <option value="isNotEmpty">Is Not Empty</option>
                            </select>
                        </div>

                        <!-- Value -->
                        <div
                            class="space-y-1 {['exists', 'isNotEmpty'].includes(
                                assertion.operator,
                            )
                                ? 'opacity-30 pointer-events-none'
                                : ''}"
                        >
                            <label
                                for="value-{assertion.id}"
                                class="block text-[10px] font-bold text-slate-400 uppercase"
                                >Target Value</label
                            >
                            <input
                                id="value-{assertion.id}"
                                type="text"
                                value={assertion.value}
                                oninput={(e) =>
                                    updateAssertion(assertion.id, {
                                        value: e.currentTarget.value,
                                    })}
                                placeholder="Expected value..."
                                class="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary transition-all font-semibold"
                            />
                        </div>
                    </div>

                    <div class="pt-6">
                        <button
                            onclick={() => removeAssertion(assertion.id)}
                            class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Remove Assertion"
                        >
                            <span class="material-symbols-outlined text-[20px]"
                                >delete</span
                            >
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div
            class="py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl text-center bg-slate-50/30 dark:bg-slate-800/10"
        >
            <div
                class="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3"
            >
                <span
                    class="material-symbols-outlined text-slate-400 text-[20px]"
                    >rule</span
                >
            </div>
            <p class="text-[11px] font-medium text-slate-500">
                No assertions defined for this step.
            </p>
            <p class="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                Add verifications to automatically test the API response and
                performance.
            </p>
        </div>
    {/if}
</div>
