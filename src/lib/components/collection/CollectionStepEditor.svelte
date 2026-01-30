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
    ) {
        let mappings = [...(step.requestMappings || [])];
        const existingIndex = mappings.findIndex(
            (m) => m.fieldPath === fieldPath,
        );
        if (existingIndex >= 0) {
            mappings[existingIndex] = { fieldPath, source, value };
        } else {
            mappings.push({ fieldPath, source, value });
        }
        onUpdate({ ...step, requestMappings: mappings });
    }

    function toggleCollapse() {
        isCollapsed = !isCollapsed;
    }
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

                                                <select
                                                    class="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                    value={selectedField}
                                                    onchange={(e) => {
                                                        updateMapping(
                                                            field.name,
                                                            "variable",
                                                            `${selectedStepId}.${(e.target as HTMLSelectElement).value}`,
                                                        );
                                                    }}
                                                    disabled={!prevEp?.responseData}
                                                >
                                                    <option value=""
                                                        >Select Field</option
                                                    >
                                                    {#if prevEp?.responseData}
                                                        {#each prevEp.responseData as respField}
                                                            <option
                                                                value={respField.name}
                                                                >{respField.name}
                                                                ({respField.description ||
                                                                    ""})</option
                                                            >
                                                        {/each}
                                                    {/if}
                                                </select>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
