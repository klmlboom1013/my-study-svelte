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
        source: "manual" | "variable" | "global" | "option" | "mid",
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

                    <!-- Endpoint Preset Selector -->
                    <select
                        class="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all"
                        onchange={(e) =>
                            handlePresetChange(
                                (e.target as HTMLSelectElement).value,
                            )}
                        value={step.presetId || ""}
                    >
                        <option value="">Default (No Preset)</option>
                        {#each presets as preset}
                            <option value={preset.id}>{preset.name}</option>
                        {/each}
                    </select>

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
                                            onchange={(e) =>
                                                updateMapping(
                                                    field.name,
                                                    (
                                                        e.target as HTMLSelectElement
                                                    ).value as any,
                                                    "",
                                                )}
                                        >
                                            <option value="manual"
                                                >Manual</option
                                            >
                                            {#if index > 0}
                                                <option value="variable"
                                                    >From Previous Step</option
                                                >
                                            {/if}
                                            <option value="global"
                                                >From Global Parameter</option
                                            >
                                            <option value="option"
                                                >From Parameter Option</option
                                            >
                                            <option value="mid"
                                                >From MID Context</option
                                            >
                                        </select>
                                    </div>

                                    {#if source === "variable"}
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
                                    {:else if source === "global"}
                                        {@const globalParams =
                                            $settingsStore.endpoint_parameters
                                                .globalParameters || []}
                                        <div class="flex flex-col gap-2">
                                            <select
                                                class="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                {value}
                                                onchange={(e) =>
                                                    updateMapping(
                                                        field.name,
                                                        "global",
                                                        (
                                                            e.target as HTMLSelectElement
                                                        ).value,
                                                    )}
                                            >
                                                <option value=""
                                                    >Select Global Parameter</option
                                                >
                                                {#each globalParams as param}
                                                    <option value={param.key}
                                                        >{param.key} ({param.value})</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>
                                    {:else if source === "option"}
                                        {@const paramOptions =
                                            $settingsStore.endpoint_parameters
                                                .parameterOptions || []}
                                        {@const [optionId, optionValue] =
                                            value.includes(":")
                                                ? value.split(":")
                                                : [value, ""]}
                                        {@const selectedOption =
                                            paramOptions.find(
                                                (o) => o.id === optionId,
                                            )}
                                        <div class="flex flex-col gap-2">
                                            <select
                                                class="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                value={optionId}
                                                onchange={(e) =>
                                                    updateMapping(
                                                        field.name,
                                                        "option",
                                                        (
                                                            e.target as HTMLSelectElement
                                                        ).value,
                                                    )}
                                            >
                                                <option value=""
                                                    >Select Option Group</option
                                                >
                                                {#each paramOptions as opt}
                                                    <option value={opt.id}
                                                        >{opt.name}</option
                                                    >
                                                {/each}
                                            </select>

                                            {#if selectedOption}
                                                <select
                                                    class="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                    value={optionValue}
                                                    onchange={(e) => {
                                                        const newValue = (
                                                            e.target as HTMLSelectElement
                                                        ).value;
                                                        updateMapping(
                                                            field.name,
                                                            "option",
                                                            `${optionId}:${newValue}`,
                                                        );
                                                    }}
                                                >
                                                    <option value=""
                                                        >Select Value</option
                                                    >
                                                    {#each selectedOption.options as optVal}
                                                        <option
                                                            value={optVal.value}
                                                            >{optVal.code} - {optVal.value}</option
                                                        >
                                                    {/each}
                                                </select>
                                            {/if}
                                        </div>
                                    {:else if source === "mid"}
                                        {@const midContexts =
                                            $settingsStore.endpoint_parameters
                                                .midContexts || []}
                                        {@const [contextId, contextField] =
                                            value.includes(":")
                                                ? value.split(":")
                                                : [value, ""]}
                                        <div class="flex flex-col gap-2">
                                            <select
                                                class="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                value={contextId}
                                                onchange={(e) =>
                                                    updateMapping(
                                                        field.name,
                                                        "mid",
                                                        (
                                                            e.target as HTMLSelectElement
                                                        ).value,
                                                    )}
                                            >
                                                <option value=""
                                                    >Select MID Context</option
                                                >
                                                {#each midContexts as ctx}
                                                    <option value={ctx.id}
                                                        >{ctx.mid} ({ctx.application})</option
                                                    >
                                                {/each}
                                            </select>

                                            {#if contextId}
                                                <select
                                                    class="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                    value={contextField}
                                                    onchange={(e) => {
                                                        const newField = (
                                                            e.target as HTMLSelectElement
                                                        ).value;
                                                        updateMapping(
                                                            field.name,
                                                            "mid",
                                                            `${contextId}:${newField}`,
                                                        );
                                                    }}
                                                >
                                                    <option value=""
                                                        >Select Field</option
                                                    >
                                                    <option value="mid"
                                                        >MID</option
                                                    >
                                                    <option value="encKey"
                                                        >EncKey</option
                                                    >
                                                    <option value="encIV"
                                                        >EncIV</option
                                                    >
                                                    <option value="hashKey"
                                                        >HashKey</option
                                                    >
                                                </select>
                                            {/if}
                                        </div>
                                    {:else}
                                        <input
                                            type="text"
                                            placeholder="Enter manual value"
                                            class="w-full px-2 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            {value}
                                            oninput={(e) =>
                                                updateMapping(
                                                    field.name,
                                                    "manual",
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                )}
                                        />
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
