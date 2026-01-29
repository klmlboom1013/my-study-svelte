<script lang="ts">
    import {
        settingsStore,
        type CollectionStep,
    } from "$lib/stores/settingsStore";
    import { endpointService } from "$lib/features/endpoints/services/endpointService";
    import type { Endpoint } from "$lib/types/endpoint";
    import { onMount } from "svelte";

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

    let endpoint = $state<Endpoint | undefined>(undefined);
    let presets = $state<any[]>([]);
    let previousEndpoints = $state<Map<string, Endpoint>>(new Map());

    $effect(() => {
        endpoint = endpointService.getEndpoint(step.endpointId);
        // Load presets logic here if needed
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
</script>

<div
    class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all mb-6"
>
    <div
        class="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"
    >
        <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300">
            Collection Step {index + 1}
        </h3>
        <button
            onclick={onRemove}
            class="p-1 text-slate-400 hover:text-red-500 transition-colors"
        >
            <span class="material-symbols-outlined text-[20px]">delete</span>
        </button>
    </div>

    <div class="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- 1. Endpoint Info -->
        <div
            class="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 min-h-[160px]"
        >
            {#if endpoint}
                <div class="text-center">
                    <div class="mb-2">
                        <span
                            class="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider"
                        >
                            {endpoint.method}
                        </span>
                    </div>
                    <div
                        class="font-bold text-slate-900 dark:text-white mb-1 truncate max-w-[150px]"
                    >
                        {endpoint.name}
                    </div>
                    <div
                        class="text-[11px] text-slate-500 truncate max-w-[150px]"
                    >
                        {endpoint.uri}
                    </div>
                </div>
            {:else}
                <div class="text-slate-400 text-sm">Loading endpoint...</div>
            {/if}
        </div>

        <!-- 2. Select Endpoint Preset & Mapping -->
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
                        Endpoint의 Request Field 값을 설정합니다. 이전 Step의
                        Response 데이터를 매핑하여 사용할 수 있습니다.
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
                {#if endpoint?.requestData && previousSteps.length > 0}
                    <div class="flex flex-col gap-3 mt-2">
                        {#each endpoint.requestData as field}
                            {@const mapping = getMapping(field.name)}
                            {@const source = mapping?.source || "manual"}
                            {@const value = mapping?.value || ""}

                            <div
                                class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                                <div
                                    class="flex items-center justify-between mb-2"
                                >
                                    <span
                                        class="text-xs font-bold font-mono text-slate-700 dark:text-slate-300"
                                        >{field.name}</span
                                    >
                                    <select
                                        class="px-2 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        value={source}
                                        onchange={(e) =>
                                            updateMapping(
                                                field.name,
                                                (e.target as HTMLSelectElement)
                                                    .value as any,
                                                "",
                                            )}
                                    >
                                        <option value="manual">Manual</option>
                                        <option value="variable"
                                            >From Previous Step</option
                                        >
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
                                                    stepId ? `${stepId}.` : "",
                                                );
                                            }}
                                        >
                                            <option value="">Select Step</option
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
                                                        s.id === selectedStepId,
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
                                                            >{respField.name} ({respField.description ||
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
                                    {@const selectedOption = paramOptions.find(
                                        (o) => o.id === optionId,
                                    )}
                                    <div class="flex flex-col gap-2">
                                        <!-- Option Group Selector -->

                                        <!-- Option Group Selector -->
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

                                        <!-- Value Selector -->
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
                                                    <option value={optVal.value}
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
                                        <!-- MID Context Selector -->

                                        <!-- MID Context Selector -->
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

                                        <!-- Field Selector -->
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
                                                <option value="mid">MID</option>
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
                                                (e.target as HTMLInputElement)
                                                    .value,
                                            )}
                                    />
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- 3. Save Response Field -->
        <div class="flex flex-col gap-4">
            <div
                class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2"
            >
                <span
                    class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider"
                    >Save Response field</span
                >
            </div>

            <div class="space-y-4">
                <div class="flex flex-col gap-1.5">
                    <span
                        class="text-[11px] font-semibold text-slate-500 uppercase"
                        >Response field</span
                    >
                    <p class="text-[11px] text-slate-500 leading-relaxed">
                        Response Data 중 임시 저장할 field를 선택한다. 임시
                        저장된 Response 데이터는 다음 Step 진행 과정에서 Request
                        Data를 세팅할 때 사용된다.
                    </p>
                </div>

                <div
                    class="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-md border border-amber-100 dark:border-amber-900/30"
                >
                    <p class="text-[10px] text-amber-700 dark:text-amber-400">
                        Step1에서 임시저장으로 선택한 Response Field의 데이터를
                        사용하도록 매핑 처리 설정을 할 수 있다.
                    </p>
                </div>

                <!-- Variable Mapping UI could go here -->
            </div>
        </div>
    </div>
</div>
