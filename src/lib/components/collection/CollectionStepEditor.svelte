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
        onUpdate: (step: CollectionStep) => void;
        onRemove: () => void;
    }

    let { step, index, onUpdate, onRemove }: Props = $props();

    let endpoint = $state<Endpoint | undefined>(undefined);
    let presets = $state<any[]>([]);

    onMount(() => {
        endpoint = endpointService.getEndpoint(step.endpointId);
        // Load presets for this endpoint if any
        // Assuming endpoint data has presets or we can fetch them
    });

    function handlePresetChange(presetId: string) {
        onUpdate({ ...step, presetId });
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

        <!-- 2. Select Endpoint Preset -->
        <div class="flex flex-col gap-4">
            <div
                class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2"
            >
                <span
                    class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider"
                    >Select endpoint preset</span
                >
            </div>

            <div class="space-y-4">
                <div class="flex flex-col gap-1.5">
                    <span
                        class="text-[11px] font-semibold text-slate-500 uppercase"
                        >Request fields</span
                    >
                    <p class="text-[11px] text-slate-500 leading-relaxed">
                        Endpoint preset에서 사용할 정보를 선택한다. 테스트를
                        위한 Request field에 데이터를 세팅할 수 있다.
                    </p>
                </div>

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

                <div
                    class="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-900/30"
                >
                    <p class="text-[10px] text-blue-700 dark:text-blue-400">
                        기본적인 세팅 방식은 Execute Endpoint Modal 화면에서
                        Request field 세팅하는 방법과 동일하다.
                    </p>
                </div>
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
