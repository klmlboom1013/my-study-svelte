<script lang="ts">
    import {
        settingsStore,
        type CollectionStep,
    } from "$lib/stores/settingsStore";
    import { endpointService } from "$lib/features/endpoints/services/endpointService";
    import { executionService } from "$lib/features/execution/services/executionService";
    import type { Endpoint } from "$lib/types/endpoint";
    import { onMount } from "svelte";
    import { slide } from "svelte/transition";
    import CollectionConditionFieldSelector from "./CollectionConditionFieldSelector.svelte";

    interface Props {
        step: CollectionStep;
        index: number;
        previousSteps?: CollectionStep[];
        onUpdate: (step: CollectionStep) => void;
        onRemove: () => void;
    }

    let {
        step = $bindable(),
        index,
        previousSteps = [],
        onUpdate,
        onRemove,
    }: Props = $props();

    let isCollapsed = $state(false);

    let endpoint = $state<Endpoint | undefined>(undefined);
    let presets = $state<any[]>([]);
    let previousEndpoints = $state<Map<string, Endpoint>>(new Map());

    $effect(() => {
        endpoint = endpointService.getEndpoint(step.endpointId);
        if (step.endpointId) {
            presets =
                executionService.getHistory(step.endpointId).presets || [];
        } else {
            presets = [];
        }
    });

    // Load previous endponits
    $effect(() => {
        const newMap = new Map<string, Endpoint>();
        previousSteps.forEach((s) => {
            const ep = endpointService.getEndpoint(s.endpointId);
            if (ep) {
                newMap.set(s.id, ep);
            }
        });
        previousEndpoints = newMap;
    });

    function handlePresetChange(presetId: string) {
        onUpdate({ ...step, presetId });
    }

    function getMapping(fieldPath: string) {
        return step.requestMappings?.find((m) => m.fieldPath === fieldPath);
    }

    function updateMapping(
        fieldPath: string,
        source: "manual" | "variable" | "random",
        value: string,
        text?: string,
        text2?: string,
    ) {
        let mappings = [...(step.requestMappings || [])];
        const existingIndex = mappings.findIndex(
            (m) => m.fieldPath === fieldPath,
        );

        let newMapping: any = { fieldPath, source, value };

        // Handle text (Label 1)
        if (text !== undefined) {
            newMapping.text = text;
        } else if (
            existingIndex >= 0 &&
            mappings[existingIndex].text &&
            source === "variable"
        ) {
            newMapping.text = mappings[existingIndex].text;
        }

        // Handle text2 (Label 2)
        if (text2 !== undefined) {
            newMapping.text2 = text2;
        } else if (
            existingIndex >= 0 &&
            mappings[existingIndex].text2 &&
            source === "variable"
        ) {
            newMapping.text2 = mappings[existingIndex].text2;
        }

        if (existingIndex >= 0) {
            mappings[existingIndex] = newMapping;
        } else {
            mappings.push(newMapping);
        }
        onUpdate({ ...step, requestMappings: mappings });
    }

    function toggleCollapse() {
        isCollapsed = !isCollapsed;
    }
    // ... (omitted shared lines for safe replacement context, but wait, replace_file_content requires exact match of replaced content)
    // Actually, I should use MULTI_REPLACE because I'm touching two places: the function definition and the UI loop.

    function toggleConditionEnabled(enabled: boolean) {
        // Legacy support shim: if enabling, ensure we have at least one condition if using new array
        if (
            enabled &&
            (!step.nextStepConditions || step.nextStepConditions.length === 0)
        ) {
            // Migration or init
            const legacy = step.nextStepCondition || {
                enabled: true,
                field: "",
                value: "",
                operator: "equals" as const,
            };
            onUpdate({
                ...step,
                nextStepCondition: undefined, // Clear legacy to avoid confusion? Or keep sync? Let's favor new array.
                nextStepConditions: [
                    {
                        enabled: true,
                        field: legacy.field,
                        values: legacy.value ? [legacy.value] : [],
                        operator: "equals",
                    },
                ],
            });
        } else if (!enabled) {
            // Disable all? Or just clear?
            // The toggle usually implies "Feature Enabled".
            // If we have a list, maybe we don't need a master toggle, checking if array length > 0 is enough?
            // But the UI shows a master toggle. Let's treat it as "clearing all" or just hiding the UI?
            // Existing behavior: toggle enabled flag.
            // New behavior: If disabled, maybe we clear the array or just valid if there are conditions?
            // Let's assume the Master Toggle controls visibility/activity of the entire feature.
            // But we don't have a master 'enabled' field on the step itself for this array.
            // Let's assume if array exists and length > 0, it is enabled.
            // So if user turns OFF, we ask "Delete all conditions?".
            // Actually, let's keep it simple. If valid conditions exist, it's active.
            // The UI "Enabled" switch might be redundant if we just showing specific conditions.
            // BUT, to keep UI consistent, let's say "Enabled" means "Has at least one active condition".
        }
    }

    // New Helper Functions
    function addCondition() {
        const newConditions = [...(step.nextStepConditions || [])];
        newConditions.push({
            enabled: true,
            field: "",
            values: [],
            operator: "equals",
        });
        onUpdate({ ...step, nextStepConditions: newConditions });
    }

    function removeCondition(index: number) {
        const newConditions = [...(step.nextStepConditions || [])];
        newConditions.splice(index, 1);
        onUpdate({ ...step, nextStepConditions: newConditions });
    }

    function updateCondition(
        index: number,
        updates: Partial<
            NonNullable<CollectionStep["nextStepConditions"]>[number]
        >,
    ) {
        const newConditions = [...(step.nextStepConditions || [])];
        if (newConditions[index]) {
            newConditions[index] = { ...newConditions[index], ...updates };
            onUpdate({ ...step, nextStepConditions: newConditions });
        }
    }

    // Migration Effect
    $effect(() => {
        // One-time migration from legacy object to array if array is missing but object exists
        if (
            step.nextStepCondition &&
            (!step.nextStepConditions || step.nextStepConditions.length === 0)
        ) {
            // Check if legacy has real data
            if (step.nextStepCondition.field || step.nextStepCondition.value) {
                const legacy = step.nextStepCondition;
                onUpdate({
                    ...step,
                    nextStepConditions: [
                        {
                            enabled: legacy.enabled,
                            field: legacy.field,
                            values: legacy.value ? [legacy.value] : [],
                            operator: (legacy.operator as any) || "equals",
                        },
                    ],
                });
            }
        }
    });
</script>

<div
    class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all mb-6"
>
    <div
        class="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer select-none"
        onclick={toggleCollapse}
        onkeydown={(e) => e.key === "Enter" && toggleCollapse()}
        role="button"
        tabindex="0"
    >
        <div class="flex items-center gap-3">
            <span
                class="material-symbols-outlined text-slate-400 transition-transform duration-300 {isCollapsed
                    ? '-rotate-90'
                    : ''}"
            >
                expand_more
            </span>
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">
                Collection Step {index + 1}
            </h3>
            {#if endpoint}
                <div
                    class="flex items-center gap-2 ml-4 px-3 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-full border border-slate-200 dark:border-slate-700"
                >
                    <span
                        class="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400"
                        >{endpoint.method}</span
                    >
                    <span
                        class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"
                    ></span>
                    <span
                        class="text-[11px] font-bold text-slate-900 dark:text-white"
                        >{endpoint.name}</span
                    >
                    <span class="text-[10px] text-slate-500 font-mono"
                        >{endpoint.uri}</span
                    >
                </div>
            {/if}
        </div>
        <button
            onclick={(e) => {
                e.stopPropagation();
                onRemove();
            }}
            class="p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
            <span class="material-symbols-outlined text-[20px]">delete</span>
        </button>
    </div>

    {#if !isCollapsed}
        <div class="p-6" transition:slide={{ duration: 300 }}>
            <!-- Request Mapping Area -->
            <div class="flex flex-col gap-4">
                <div
                    class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2"
                >
                    <span
                        class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider"
                        >Request Mapping</span
                    >
                </div>

                <div class="space-y-4">
                    <div class="flex flex-col gap-1.5">
                        <span
                            class="text-[11px] font-semibold text-slate-500 uppercase"
                            >Request fields</span
                        >
                        <p class="text-[11px] text-slate-500 leading-relaxed">
                            Endpoint의 Request Field 값을 설정합니다. 이전
                            Step의 Response 데이터를 매핑하여 사용할 수
                            있습니다.
                        </p>
                    </div>

                    <!-- Mapping UI -->
                    {#if endpoint?.requestData}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {#each endpoint.requestData as field}
                                {@const mapping = getMapping(field.name)}
                                {@const source = mapping?.source || "manual"}
                                {@const value = mapping?.value || ""}

                                <div
                                    class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                                >
                                    <div
                                        class="flex items-center justify-between mb-3"
                                    >
                                        <div class="flex flex-col">
                                            <span
                                                class="text-xs font-bold font-mono text-slate-900 dark:text-white"
                                                >{field.name}</span
                                            >
                                            {#if field.description}
                                                <span
                                                    class="text-[10px] text-slate-500 mt-0.5"
                                                    >{field.description}</span
                                                >
                                            {/if}
                                        </div>
                                        <select
                                            class="px-2 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            value={source}
                                            onchange={(e) => {
                                                const nextSource = (
                                                    e.target as HTMLSelectElement
                                                ).value as any;
                                                let nextValue = "";
                                                if (nextSource === "random") {
                                                    nextValue = `alphanumeric:${field.length || 8}`;
                                                }
                                                updateMapping(
                                                    field.name,
                                                    nextSource,
                                                    nextValue,
                                                );
                                            }}
                                        >
                                            <option value="manual"
                                                >Manual</option
                                            >
                                            {#if index > 0}
                                                <option value="variable"
                                                    >From Previous Step</option
                                                >
                                            {/if}
                                            <option value="random"
                                                >Random</option
                                            >
                                        </select>
                                    </div>

                                    {#if source === "random"}
                                        {@const config = value.includes(":")
                                            ? value.split(":")
                                            : [
                                                  "alphanumeric",
                                                  field.length || 8,
                                              ]}
                                        {@const type = config[0]}
                                        {@const length = config[1]}
                                        <div
                                            class="flex flex-col gap-2 mt-2 px-1"
                                        >
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span
                                                    class="text-[10px] text-slate-500 uppercase font-bold shrink-0"
                                                    >Type</span
                                                >
                                                <select
                                                    class="flex-1 px-2 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                    value={type}
                                                    onchange={(e) =>
                                                        updateMapping(
                                                            field.name,
                                                            "random",
                                                            `${(e.currentTarget as HTMLSelectElement).value}:${length}`,
                                                        )}
                                                >
                                                    <option value="alpha"
                                                        >Alpha</option
                                                    >
                                                    <option value="numeric"
                                                        >Numeric</option
                                                    >
                                                    <option value="alphanumeric"
                                                        >Mixed</option
                                                    >
                                                </select>
                                            </div>
                                            <div
                                                class="flex items-center gap-2"
                                            >
                                                <span
                                                    class="text-[10px] text-slate-500 uppercase font-bold shrink-0"
                                                    >Len</span
                                                >
                                                <input
                                                    type="number"
                                                    class="flex-1 px-2 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                    value={length}
                                                    oninput={(e) =>
                                                        updateMapping(
                                                            field.name,
                                                            "random",
                                                            `${type}:${(e.currentTarget as HTMLInputElement).value}`,
                                                        )}
                                                    min="1"
                                                    max={field.length}
                                                />
                                            </div>
                                            {#if field.length}
                                                <span
                                                    class="text-[9px] text-slate-400 -mt-1 italic"
                                                >
                                                    * Fixed length defined in
                                                    field: {field.length}
                                                </span>
                                            {/if}
                                        </div>
                                    {:else if source === "variable"}
                                        {@const selectedStepId = value
                                            ? value.split(".")[0]
                                            : ""}
                                        <div class="flex flex-col gap-2">
                                            <!-- Step Selector -->
                                            <select
                                                class="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                value={selectedStepId}
                                                onchange={(e) => {
                                                    const stepId = (
                                                        e.target as HTMLSelectElement
                                                    ).value;
                                                    updateMapping(
                                                        field.name,
                                                        "variable",
                                                        stepId
                                                            ? `${stepId}.`
                                                            : "",
                                                    );
                                                }}
                                            >
                                                <option value=""
                                                    >Select Step</option
                                                >
                                                {#each previousSteps as prevStep, i}
                                                    <option value={prevStep.id}
                                                        >Step {i + 1}: {prevStep.name ||
                                                            previousEndpoints.get(
                                                                prevStep.id,
                                                            )?.name ||
                                                            "Unknown"}</option
                                                    >
                                                {/each}
                                            </select>

                                            <!-- Field Selector -->
                                            {#if selectedStepId}
                                                {@const prevStep =
                                                    previousSteps.find(
                                                        (s) =>
                                                            s.id ===
                                                            selectedStepId,
                                                    )}
                                                {@const prevEp = prevStep
                                                    ? previousEndpoints.get(
                                                          prevStep.id,
                                                      )
                                                    : undefined}
                                                {@const selectedField =
                                                    value.includes(".")
                                                        ? value
                                                              .split(".")
                                                              .slice(1)
                                                              .join(".")
                                                        : ""}

                                                <!-- Value Mapping -->
                                                <div
                                                    class="flex flex-col gap-1"
                                                >
                                                    <span
                                                        class="text-[10px] text-slate-500 font-bold uppercase"
                                                        >Value Field</span
                                                    >
                                                    <CollectionConditionFieldSelector
                                                        endpoint={prevEp}
                                                        value={selectedField}
                                                        onUpdate={(val) =>
                                                            updateMapping(
                                                                field.name,
                                                                "variable",
                                                                `${selectedStepId}.${val}`,
                                                            )}
                                                    />
                                                </div>

                                                <!-- Label Mapping (New) -->
                                                <div
                                                    class="flex flex-col gap-1 mt-1"
                                                >
                                                    <span
                                                        class="text-[10px] text-slate-500 font-bold uppercase"
                                                        >Label Field (Optional)</span
                                                    >
                                                    <CollectionConditionFieldSelector
                                                        endpoint={prevEp}
                                                        value={mapping?.text &&
                                                        mapping.text.startsWith(
                                                            selectedStepId +
                                                                ".",
                                                        )
                                                            ? mapping.text
                                                                  .split(".")
                                                                  .slice(1)
                                                                  .join(".")
                                                            : ""}
                                                        onUpdate={(val) =>
                                                            updateMapping(
                                                                field.name,
                                                                "variable",
                                                                mapping?.value ||
                                                                    "", // Keep existing value
                                                                `${selectedStepId}.${val}`, // Update text
                                                                mapping?.text2, // Keep text2 explicitly
                                                            )}
                                                    />
                                                </div>

                                                <!-- Label Mapping 2 (New) -->
                                                <div
                                                    class="flex flex-col gap-1 mt-1"
                                                >
                                                    <span
                                                        class="text-[10px] text-slate-500 font-bold uppercase"
                                                        >Label Field 2
                                                        (Optional)</span
                                                    >
                                                    <CollectionConditionFieldSelector
                                                        endpoint={prevEp}
                                                        value={mapping?.text2 &&
                                                        mapping.text2.startsWith(
                                                            selectedStepId +
                                                                ".",
                                                        )
                                                            ? mapping.text2
                                                                  .split(".")
                                                                  .slice(1)
                                                                  .join(".")
                                                            : ""}
                                                        onUpdate={(val) =>
                                                            updateMapping(
                                                                field.name,
                                                                "variable",
                                                                mapping?.value ||
                                                                    "", // Keep existing value
                                                                mapping?.text, // Keep text explicitly
                                                                `${selectedStepId}.${val}`, // Update text2
                                                            )}
                                                    />
                                                </div>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
            <!-- Next Step Condition Area -->
            <div class="flex flex-col gap-4 mt-8">
                <div
                    class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2"
                >
                    <span
                        class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider"
                        >Next Step Conditions</span
                    >
                    <div class="flex-1"></div>
                    <button
                        onclick={addCondition}
                        class="px-2 py-1 text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1"
                    >
                        <span class="material-symbols-outlined text-[14px]"
                            >add</span
                        >
                        Add Condition
                    </button>
                </div>

                <div class="flex flex-col gap-1.5">
                    <p class="text-[11px] text-slate-500 leading-relaxed">
                        이 Step의 Response 값을 검증하여 다음 Step 진행 여부를
                        결정합니다. 설정된 모든 조건이 만족해야 하며(AND), 각
                        조건의 값 중 하나라도 일치하면(OR) 통과합니다.
                    </p>
                </div>

                {#if step.nextStepConditions && step.nextStepConditions.length > 0}
                    <div class="space-y-3" transition:slide={{ duration: 200 }}>
                        {#each step.nextStepConditions as condition, i}
                            <div
                                class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 relative group"
                            >
                                <button
                                    onclick={() => removeCondition(i)}
                                    class="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Remove Condition"
                                >
                                    <span
                                        class="material-symbols-outlined text-[16px]"
                                        >close</span
                                    >
                                </button>

                                <div
                                    class="grid grid-cols-1 md:grid-cols-12 gap-4"
                                >
                                    <!-- Response Field Selection -->
                                    <div
                                        class="md:col-span-4 flex flex-col gap-2"
                                    >
                                        <span
                                            class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase"
                                            >Response Field (Key)</span
                                        >
                                        <CollectionConditionFieldSelector
                                            {endpoint}
                                            value={condition.field}
                                            onUpdate={(val) =>
                                                updateCondition(i, {
                                                    field: val,
                                                })}
                                        />
                                    </div>

                                    <!-- Operator Selection -->
                                    <div
                                        class="md:col-span-3 flex flex-col gap-2"
                                    >
                                        <span
                                            class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase"
                                            >Operator</span
                                        >
                                        <select
                                            class="w-full px-2 py-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white appearance-none"
                                            value={condition.operator ||
                                                "equals"}
                                            onchange={(e) =>
                                                updateCondition(i, {
                                                    operator: (
                                                        e.target as HTMLSelectElement
                                                    ).value as any,
                                                })}
                                        >
                                            <option value="equals"
                                                >Equals (==)</option
                                            >
                                            <option value="notEquals"
                                                >Not Equals (!=)</option
                                            >
                                            <option value="contains"
                                                >Contains (Includes)</option
                                            >
                                            <hr />
                                            <option value="isNotEmpty"
                                                >Is Not Empty</option
                                            >
                                            <option value="validSignature"
                                                >Valid Signature</option
                                            >
                                        </select>
                                    </div>

                                    <!-- Expected Values -->
                                    {#if condition.operator !== "isNotEmpty" && condition.operator !== "validSignature"}
                                        <div
                                            class="md:col-span-5 flex flex-col gap-2"
                                            transition:slide={{
                                                axis: "x",
                                                duration: 200,
                                            }}
                                        >
                                            <span
                                                class="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase"
                                                >Expected Values (Red: OR)</span
                                            >
                                            <input
                                                type="text"
                                                class="w-full px-2 py-2 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                                                placeholder="e.g. 0000, 200 (comma separated)"
                                                value={condition.values.join(
                                                    ", ",
                                                )}
                                                oninput={(e) =>
                                                    updateCondition(i, {
                                                        values: (
                                                            e.target as HTMLInputElement
                                                        ).value
                                                            .split(",")
                                                            .map((v) =>
                                                                v.trim(),
                                                            ),
                                                    })}
                                            />
                                            <span
                                                class="text-[9px] text-slate-400"
                                                >쉼표(,)로 구분하여 여러 값을
                                                입력할 수 있습니다.</span
                                            >
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div
                        class="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg"
                    >
                        <span class="text-xs text-slate-400"
                            >설정된 조건이 없습니다.</span
                        >
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
