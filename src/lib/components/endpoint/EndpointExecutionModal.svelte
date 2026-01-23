<script lang="ts">
    import { untrack } from "svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import {
        Code,
        Play,
        Plus,
        Trash2,
        ChevronDown,
        Check,
    } from "lucide-svelte";
    import { settingsStore } from "$lib/stores/settingsStore";
    import {
        generateSignature,
        encryptData,
        urlEncodeData,
        type SecurityContext,
    } from "$lib/utils/security";
    import type { Endpoint, RequestDataField } from "$lib/types/endpoint";
    import { fade, slide } from "svelte/transition";

    let {
        isOpen = $bindable(false),
        endpoint = $bindable(null as Endpoint | null),
    } = $props();

    let requestValues = $state<Record<string, any>>({});
    let jsonResult = $state("");
    let signatureRawString = $state("");
    let activeDropdownPath = $state<string | null>(null);
    let executionStage = $state<"READY" | "EXECUTE">("READY"); // New state
    let availableDomains = $state<{ label: string; value: string }[]>([]);
    let selectedDomainPrefix = $state("");

    const globalParameters = $derived(
        $settingsStore.endpoint_parameters.globalParameters,
    );
    const parameterOptions = $derived(
        $settingsStore.endpoint_parameters.parameterOptions,
    );
    const midContexts = $derived(
        $settingsStore.endpoint_parameters.midContexts,
    );
    const applications = $derived($settingsStore.applications);

    // Reset values when endpoint changes or modal opens
    $effect(() => {
        if (isOpen && endpoint) {
            untrack(() => {
                // Initialize values based on schema
                requestValues = initializeValues(endpoint.requestData);
                executionStage = "READY"; // Reset stage
                jsonResult = ""; // Reset result
                signatureRawString = ""; // Reset signature source

                // Populate available domains
                const tempDomains = [];

                const app = applications.find(
                    (a) => a.appName === endpoint?.application,
                );

                if (app) {
                    let domains = app.domains;
                    // Check service specific overrides
                    if (endpoint.scope.service && app.services) {
                        const svc = app.services.find(
                            (s) => s.name === endpoint.scope.service,
                        );
                        if (svc && svc.domains) {
                            if (Object.values(svc.domains).some((v) => v)) {
                                domains = svc.domains;
                            }
                        }
                    }

                    if (domains) {
                        if (domains.dev)
                            tempDomains.push({
                                label: "DEV",
                                value: domains.dev,
                            });
                        if (domains.stg)
                            tempDomains.push({
                                label: "STG",
                                value: domains.stg,
                            });
                        if (domains.pGlb)
                            tempDomains.push({
                                label: "pGLB",
                                value: domains.pGlb,
                            });
                        if (domains.pKs)
                            tempDomains.push({
                                label: "pKS",
                                value: domains.pKs,
                            });
                        if (domains.pFc)
                            tempDomains.push({
                                label: "pFC",
                                value: domains.pFc,
                            });
                    }
                }

                availableDomains = tempDomains;

                // Select first by default if available
                if (availableDomains.length > 0) {
                    selectedDomainPrefix = availableDomains[0].value;
                } else {
                    selectedDomainPrefix = "";
                }
            });
        }
    });

    function handleOutsideClick(event: MouseEvent) {
        if (activeDropdownPath) {
            const target = event.target as HTMLElement;
            if (!target.closest(".param-dropdown-container")) {
                activeDropdownPath = null;
            }
        }
    }

    function initializeValues(fields: RequestDataField[] = []) {
        const values: Record<string, any> = {};
        for (const field of fields) {
            if (field.type === "List") {
                values[field.name] = [];
            } else if (field.type === "boolean") {
                values[field.name] = false;
            } else {
                values[field.name] = "";
            }
        }
        return values;
    }

    async function handleExecute() {
        if (!endpoint) return;

        if (executionStage === "READY") {
            // 1. Find Security Context (HashKey, EncKey, EncIV) based on selected MID
            let context: SecurityContext = {};
            const midValue = requestValues["mid"];

            if (midValue) {
                const midCtx = midContexts.find((c) => c.mid === midValue);
                if (midCtx) {
                    context = {
                        hashKey: midCtx.hashKey,
                        encKey: midCtx.encKey,
                        encIV: midCtx.encIV,
                    };
                }
            }

            // 2. Process based on Method (GET vs POST)
            // GET: Encrypt -> Sign -> Encode
            // POST: Encrypt -> Encode -> Sign

            let processedValues = { ...requestValues };

            try {
                // Step A: Encryption (Common first step)
                processedValues = encryptData(
                    processedValues,
                    endpoint.requestData,
                    context,
                );

                const signatureField = endpoint.requestData.find(
                    (f) => f.name === "signature",
                );

                if (endpoint.method === "GET") {
                    if (endpoint.signatureMethod && signatureField) {
                        const { signature, rawString } =
                            await generateSignature(
                                processedValues,
                                endpoint.requestData,
                                endpoint.signatureMethod,
                                context,
                            );
                        processedValues[signatureField.name] = signature;
                        requestValues[signatureField.name] = signature; // Update UI
                        signatureRawString = rawString;
                    }

                    // Step C: URL Encode (Final step for GET)
                    processedValues = urlEncodeData(
                        processedValues,
                        endpoint.requestData,
                    );
                } else {
                    // POST (and others) rules

                    // Step B: URL Encode
                    processedValues = urlEncodeData(
                        processedValues,
                        endpoint.requestData,
                    );

                    // Step C: Generate Signature (on encrypted AND encoded data)
                    if (endpoint.signatureMethod && signatureField) {
                        const { signature, rawString } =
                            await generateSignature(
                                processedValues,
                                endpoint.requestData,
                                endpoint.signatureMethod,
                                context,
                            );
                        processedValues[signatureField.name] = signature;
                        requestValues[signatureField.name] = signature; // Update UI
                        signatureRawString = rawString;
                    }
                }

                // If successful, move to EXECUTE stage
                executionStage = "EXECUTE";
            } catch (e) {
                console.error("Security processing failed:", e);
                // Optionally handle error UI here
            }

            executionStage = "EXECUTE"; // Ensure it stays

            if (
                endpoint.config?.contentType ===
                "application/x-www-form-urlencoded"
            ) {
                const params = new URLSearchParams();
                Object.entries(processedValues).forEach(([key, value]) => {
                    params.append(key, String(value));
                });
                jsonResult = params.toString().split("&").join("\n");
            } else {
                jsonResult = JSON.stringify(processedValues, null, 2);
            }
        } else {
            // EXECUTE stage logic
            executionStage = "EXECUTE";
            console.log("Executing request...");
        }
    }

    // ... [Original addListItem, removeListItem, getOptions etc. remain unchanged] ...
    // Since I'm replacing a large block, I need to include the functions I'm actively *not* changing if they are inside the replaced range
    // BUT replace_file_content works on line ranges. I should try to narrow the range if possible, or just be careful.
    // The previous block was lines 26-145 (variables + handleExecute).
    // I will target that block specifically.

    function handleUserChange() {
        if (executionStage === "EXECUTE") {
            executionStage = "READY";
            jsonResult = ""; // Clear result to avoid confusion
            signatureRawString = ""; // Clear signature source
        }
    }

    function addListItem(fieldName: string, subFields?: RequestDataField[]) {
        if (!requestValues[fieldName]) requestValues[fieldName] = [];
        requestValues[fieldName] = [
            ...requestValues[fieldName],
            initializeValues(subFields),
        ];
        handleUserChange();
    }

    function removeListItem(fieldName: string, index: number) {
        requestValues[fieldName] = requestValues[fieldName].filter(
            (_: any, i: number) => i !== index,
        );
        handleUserChange();
    }

    function getOptions(field: RequestDataField) {
        if (!endpoint || !field.name) return [];

        const options: { value: string; label: string; source: string }[] = [];
        const app = endpoint.application;
        const service = endpoint.scope.service;

        // 1. Global Parameters check
        globalParameters.forEach((param) => {
            if (param.application === app && param.key === field.name) {
                const isServiceMatch =
                    !param.service ||
                    param.service.length === 0 ||
                    (service && param.service.includes(service));

                if (isServiceMatch) {
                    options.push({
                        value: param.value,
                        label: `${param.value} (Global)`,
                        source: "Global",
                    });
                }
            }
        });

        // 2. Parameter Options check
        parameterOptions.forEach((opt) => {
            if (opt.application === app && opt.name === field.name) {
                const isServiceMatch =
                    !opt.service ||
                    opt.service.length === 0 ||
                    (service && opt.service.includes(service));

                if (isServiceMatch) {
                    opt.options.forEach((co) => {
                        options.push({
                            value: co.value,
                            label: `${co.value} (${co.code})`,
                            source: "Option",
                        });
                    });
                }
            }
        });

        // 3. MID Context check
        if (field.name === "mid") {
            midContexts.forEach((ctx) => {
                if (ctx.application === app) {
                    const isServiceMatch =
                        !ctx.service ||
                        ctx.service.length === 0 ||
                        (service && ctx.service.includes(service));

                    if (isServiceMatch) {
                        options.push({
                            value: ctx.mid,
                            label: `${ctx.mid}`,
                            source: "MID",
                        });
                    }
                }
            });
        }

        return options;
    }
</script>

{#snippet renderField(
    field: RequestDataField,
    values: any,
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
        <tr
            class="border-b border-slate-200 dark:border-border-dark last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        >
            <!-- Name Column -->
            <td
                class="p-4 align-top w-1/3 border-r border-slate-100 dark:border-border-dark/50"
            >
                <div
                    class="flex flex-col gap-1"
                    style="padding-left: {level * 1.5}rem;"
                >
                    <div class="flex items-center gap-2 flex-wrap">
                        <label
                            for={path}
                            class="font-semibold text-sm text-slate-700 dark:text-slate-200 break-all"
                        >
                            {field.name}
                        </label>
                        {#if field.required}
                            <span
                                class="text-[10px] uppercase font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded"
                            >
                                Required
                            </span>
                        {/if}
                    </div>
                    <div
                        class="text-xs text-slate-500 dark:text-slate-400 font-mono"
                    >
                        {field.type}
                    </div>
                    {#if field.description}
                        <div
                            class="text-xs text-slate-500 mt-1 leading-relaxed"
                        >
                            {field.description}
                        </div>
                    {/if}
                </div>
            </td>

            <!-- Value Column -->
            <td class="p-4 align-top w-2/3">
                {#if field.type === "List"}
                    <div class="flex flex-col gap-3">
                        {#if values[field.name] && Array.isArray(values[field.name])}
                            {#each values[field.name] as item, index}
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
                                                )}
                                            class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove Item"
                                        >
                                            <Trash2 class="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div class="bg-white dark:bg-slate-950">
                                        <table
                                            class="w-full text-left border-collapse"
                                        >
                                            <tbody>
                                                {#each field.subFields || [] as subField}
                                                    {@render renderField(
                                                        subField,
                                                        item,
                                                        `${path}[${index}].${subField.name}`,
                                                        level + 1,
                                                    )}
                                                {/each}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            {/each}
                        {/if}
                        <button
                            onclick={() =>
                                addListItem(field.name, field.subFields)}
                            class="flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors border-dashed w-full"
                        >
                            <Plus class="w-4 h-4" />
                            Add Item
                        </button>
                    </div>
                {:else if field.type === "boolean"}
                    <select
                        id={path}
                        bind:value={values[field.name]}
                        onchange={handleUserChange}
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
                                bind:value={values[field.name]}
                                oninput={handleUserChange}
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
                                    transition:slide={{
                                        duration: 200,
                                        axis: "y",
                                    }}
                                    class="absolute right-0 top-full mt-1 z-50 w-full min-w-[200px] max-h-[200px] overflow-y-auto rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-900 shadow-xl"
                                >
                                    {#each options as opt}
                                        <button
                                            type="button"
                                            class="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
                                            onclick={() => {
                                                values[field.name] = opt.value;
                                                activeDropdownPath = null;
                                                handleUserChange();
                                            }}
                                        >
                                            <div class="flex flex-col gap-0.5">
                                                <span
                                                    class="font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-primary transition-colors"
                                                >
                                                    {opt.value}
                                                </span>
                                                <span
                                                    class="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]"
                                                >
                                                    {opt.source}
                                                    {opt.source === "Option"
                                                        ? `• ${opt.label.split("(")[1].replace(")", "")}`
                                                        : ""}
                                                </span>
                                            </div>
                                            {#if values[field.name] === opt.value}
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
                            bind:value={values[field.name]}
                            oninput={handleUserChange}
                            placeholder={field.description ||
                                `Enter ${field.name}`}
                            class="w-full px-3 py-2 text-sm font-normal rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                        />
                    {/if}
                {/if}
            </td>
        </tr>
    {/if}
{/snippet}

<svelte:window onclick={handleOutsideClick} />

<Modal
    bind:isOpen
    title="Execute Endpoint"
    width="max-w-4xl"
    bodyClass="grid grid-rows-[auto_1fr] max-h-[70vh] overflow-hidden text-base font-medium"
>
    {#if endpoint}
        <!-- Fixed Header Info -->
        <!-- Fixed Header Info -->
        <div
            class="p-5 bg-slate-50 dark:bg-card-dark border-b border-slate-200 dark:border-border-dark shadow-sm z-10 flex justify-between items-start gap-4"
        >
            <div class="flex flex-col gap-3 flex-1 min-w-0">
                <!-- Row 1: App & Method -->
                <div class="flex items-center gap-2">
                    <span
                        class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                        {endpoint.application}
                    </span>
                    <span
                        class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                        {endpoint.method}
                    </span>
                </div>

                <!-- Row 2: Name -->
                <h3
                    class="font-bold text-xl text-slate-900 dark:text-white leading-tight"
                >
                    {endpoint.name}
                </h3>

                <!-- Row 3: Request Specs -->
                <div class="flex items-center gap-3 text-sm">
                    <div class="flex items-center gap-1.5">
                        <span class="text-slate-500 dark:text-slate-400 text-xs"
                            >Type</span
                        >
                        <span
                            class="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                        >
                            {endpoint.requestType}
                        </span>
                    </div>

                    {#if endpoint.config.contentType}
                        <div
                            class="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-1"
                        ></div>
                        <div class="flex items-center gap-1.5">
                            <span
                                class="text-slate-500 dark:text-slate-400 text-xs"
                                >Content-Type</span
                            >
                            <span
                                class="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                            >
                                {endpoint.config.contentType}
                            </span>
                        </div>
                    {/if}
                </div>

                <!-- Row 4: Domain & URI -->
                <div class="mt-2 flex flex-col gap-2">
                    <div class="flex items-center gap-2">
                        {#if availableDomains.length > 0}
                            <select
                                bind:value={selectedDomainPrefix}
                                class="px-2 py-1.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                {#each availableDomains as domain}
                                    <option value={domain.value}
                                        >{domain.label}</option
                                    >
                                {/each}
                            </select>
                        {/if}

                        <div
                            class="flex items-center gap-1.5 px-2 py-1.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30"
                        >
                            <span
                                class="text-[10px] uppercase font-bold opacity-70"
                                >Site</span
                            >
                            <span class="text-xs font-semibold"
                                >{endpoint.scope.site}</span
                            >
                        </div>
                    </div>

                    <div
                        class="px-3 py-2 bg-white dark:bg-slate-950/50 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400 break-all w-full flex items-center gap-1"
                    >
                        {#if selectedDomainPrefix}
                            <span class="text-slate-400 select-none"
                                >{selectedDomainPrefix}</span
                            >
                        {/if}
                        <span>{endpoint.uri}</span>
                    </div>
                </div>
            </div>

            <!-- Execute Button -->
            <button
                onclick={handleExecute}
                class="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shrink-0 rounded-lg shadow-sm {executionStage ===
                'READY'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}"
            >
                {#if executionStage === "READY"}
                    <Check class="w-4 h-4" />
                    Ready
                {:else}
                    <Play class="w-4 h-4" fill="currentColor" />
                    Execute
                {/if}
            </button>
        </div>

        <!-- Scrollable Body -->
        <div
            class="overflow-y-auto min-h-0 p-6 flex flex-col gap-6 bg-white dark:bg-slate-900"
        >
            <!-- Data Input Form -->
            <div class="flex flex-col gap-4">
                {#if endpoint.requestData && endpoint.requestData.length > 0}
                    <div
                        class="rounded-lg border border-slate-200 dark:border-border-dark"
                    >
                        <table
                            class="w-full text-left border-collapse bg-white dark:bg-slate-950/50"
                        >
                            <thead
                                class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-border-dark"
                            >
                                <tr>
                                    <th
                                        class="p-4 w-1/3 font-semibold text-sm text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-border-dark/50"
                                        >Name</th
                                    >
                                    <th
                                        class="p-4 w-2/3 font-semibold text-sm text-slate-600 dark:text-slate-400"
                                        >Description</th
                                    >
                                </tr>
                            </thead>
                            <tbody>
                                {#each endpoint.requestData as field}
                                    {@render renderField(
                                        field,
                                        requestValues,
                                        field.name,
                                    )}
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {:else}
                    <div
                        class="p-8 border-2 border-dashed border-slate-300 dark:border-border-dark rounded-xl flex flex-col items-center justify-center text-slate-500 gap-2"
                    >
                        <Code class="w-8 h-8 opacity-50" />
                        <p>No request data configured.</p>
                    </div>
                {/if}
            </div>

            <!-- Signature Source Display -->
            {#if signatureRawString}
                <div
                    class="rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden shrink-0"
                >
                    <div
                        class="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-border-dark font-medium text-sm text-slate-700 dark:text-slate-300"
                    >
                        Signature Source String
                    </div>
                    <div
                        class="p-4 bg-white dark:bg-slate-950/50 font-mono text-sm text-slate-600 dark:text-slate-400 break-all"
                    >
                        {signatureRawString}
                    </div>
                </div>
            {/if}

            <!-- Execution Result -->
            {#if jsonResult}
                <div
                    class="rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden shrink-0"
                >
                    <div
                        class="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-border-dark font-medium text-sm text-slate-700 dark:text-slate-300"
                    >
                        Request Parameters
                    </div>
                    <pre
                        class="p-4 bg-slate-900 text-slate-50 overflow-x-auto text-sm font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">{jsonResult}</pre>
                </div>
            {/if}
        </div>
    {/if}
</Modal>
