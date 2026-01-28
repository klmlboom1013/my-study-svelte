<script lang="ts">
    import { untrack, tick } from "svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import { syncService } from "$lib/features/drive/services/syncService";
    import {
        authStore,
        loginWithGoogle,
        disconnectGoogle,
    } from "$lib/features/auth/services/authService";
    import {
        executionService,
        type ExecutionPreset,
    } from "$lib/features/execution/services/executionService";
    import { wpayExecutionService } from "$lib/features/execution/services/wpayExecutionService";
    import { settingsStore } from "$lib/stores/settingsStore";
    import {
        generateSignature,
        encryptData,
        decryptData,
        urlDecodeData,
        urlEncodeData,
        decryptString,
        urlDecodeString,
        type SecurityContext,
    } from "$lib/utils/security";
    import type {
        Endpoint,
        RequestDataField,
        ResponseDataField,
    } from "$lib/types/endpoint";
    import {
        Code,
        Loader2,
        Play,
        Check,
        ArrowUp,
        RotateCcw,
        CloudDownload,
        X,
        CloudUpload,
        Bookmark,
        Trash2,
    } from "lucide-svelte";
    import { scale, slide } from "svelte/transition";

    // Sub-components
    import ExecutionSettings from "./ExecutionSettings.svelte";
    import ExecutionParameterForm from "./ExecutionParameterForm.svelte";
    import ExecutionResultView from "./ExecutionResultView.svelte";

    let {
        isOpen = $bindable(false),
        endpoint = $bindable(null as Endpoint | null),
    } = $props();

    // State Core
    let requestValues = $state<Record<string, any>>({});
    let jsonResult = $state("");
    let responseResult = $state("");
    let responseStatus = $state<number | null>(null);
    let signatureRawString = $state("");
    let activeDropdownPath = $state<string | null>(null);
    let executionStage = $state<"READY" | "EXECUTE">("READY");
    let isExecuting = $state(false);
    let availableDomains = $state<{ label: string; value: string }[]>([]);
    let selectedDomainPrefix = $state("");
    let securityContext = $state<SecurityContext>({});

    // Preset & History State
    let presets = $state<ExecutionPreset[]>([]);

    // Response Validation State
    let responseSignatureRawString = $state("");
    let responseCalculatedSignature = $state("");
    let responseValidationSuccess = $state<boolean | null>(null);
    let responseDecryptedData = $state<
        { name: string; value: string; original: string; type: string }[]
    >([]);

    // Sync Notification State
    let showSyncAlert = $state(false);
    let syncAlertMessage = $state("");
    let syncAlertTitle = $state("");
    let isBackingUp = $state(false);
    let isRestoring = $state(false);

    let isButtonInView = $state(true);

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

    async function scrollToBottom() {
        await tick();
        const modalBody = document.querySelector(".max-h-\\[85vh\\]");
        if (modalBody) {
            modalBody.scrollTo({
                top: modalBody.scrollHeight,
                behavior: "smooth",
            });
        }
    }

    function scrollToTop() {
        // Scroll to top implementation - no longer relies on headerRef
        const modalBody = document.querySelector(".max-h-\\[85vh\\]");
        if (modalBody) {
            modalBody.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
    }

    // Handlers
    function handleUserChange() {
        executionStage = "READY";
        jsonResult = "";
        responseResult = "";
        responseStatus = null;
    }

    // Settings logic (reset, domain population, etc)
    $effect(() => {
        if (isOpen && endpoint) {
            untrack(() => {
                const history = executionService.getHistory(endpoint.id);
                presets = history.presets;

                if (history.lastUsed) {
                    const baseValues = initializeValues(endpoint.requestData);
                    const { domainPrefix: lastDomain, ...lastValues } =
                        history.lastUsed;
                    requestValues = { ...baseValues, ...lastValues };
                    if (lastDomain) selectedDomainPrefix = lastDomain;
                } else {
                    requestValues = initializeValues(endpoint.requestData);
                }

                executionStage = "READY";
                jsonResult = "";
                responseResult = "";
                responseStatus = null;
                signatureRawString = "";

                // Populate available domains
                const tempDomains = [];
                const app = applications.find(
                    (a) => a.appName === endpoint?.application,
                );
                if (app) {
                    let domains = app.domains;
                    if (endpoint.scope.service && app.services) {
                        const svc = app.services.find(
                            (s) => s.name === endpoint.scope.service,
                        );
                        if (
                            svc?.domains &&
                            Object.values(svc.domains).some((v) => v)
                        )
                            domains = svc.domains;
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
                if (availableDomains.length > 0)
                    selectedDomainPrefix = availableDomains[0].value;
            });
        }
    });

    function initializeValues(fields: RequestDataField[] = []) {
        const values: Record<string, any> = {};
        for (const field of fields) {
            if (field.subFields && field.subFields.length > 0) {
                values[field.name] =
                    field.type === "List"
                        ? []
                        : initializeValues(field.subFields);
            } else {
                const def = field.defaultValue;
                values[field.name] =
                    (def && typeof def !== "object" ? def : "") ||
                    (field.type === "boolean" ? false : "");
            }
        }
        return values;
    }

    function getOptions(field: RequestDataField) {
        if (!endpoint || !field.name) return [];
        const options: { value: string; label: string; source: string }[] = [];
        const app = endpoint.application;
        const service = endpoint.scope.service;

        globalParameters.forEach((param) => {
            if (param.application === app && param.key === field.name) {
                if (
                    !param.service ||
                    param.service.length === 0 ||
                    (service && param.service.includes(service))
                ) {
                    options.push({
                        value: param.value,
                        label: `${param.value} (Global)`,
                        source: "Global",
                    });
                }
            }
        });

        parameterOptions.forEach((opt) => {
            if (opt.application === app && opt.name === field.name) {
                if (
                    !opt.service ||
                    opt.service.length === 0 ||
                    (service && opt.service.includes(service))
                ) {
                    opt.options.forEach((co) =>
                        options.push({
                            value: co.value,
                            label: `${co.value} (${co.code})`,
                            source: "Option",
                        }),
                    );
                }
            }
        });

        if (field.name === "mid") {
            midContexts.forEach((ctx) => {
                if (
                    ctx.application === app &&
                    (!ctx.service ||
                        ctx.service.length === 0 ||
                        (service && ctx.service.includes(service)))
                ) {
                    options.push({
                        value: ctx.mid,
                        label: `${ctx.mid}`,
                        source: "MID",
                    });
                }
            });
        }
        return options;
    }

    async function handleExecute() {
        if (!endpoint) return;

        if (executionStage === "READY") {
            const midValue = requestValues["mid"];
            securityContext = {};
            if (midValue) {
                const midCtx = midContexts.find((c) => c.mid === midValue);
                if (midCtx)
                    securityContext = {
                        hashKey: midCtx.hashKey,
                        encKey: midCtx.encKey,
                        encIV: midCtx.encIV,
                    };
            }

            try {
                let processedValues = encryptData(
                    { ...requestValues },
                    endpoint.requestData,
                    securityContext,
                );
                const signatureField = endpoint.requestData.find(
                    (f) => f.name === "signature",
                );

                if (endpoint.requestType === "FORM") {
                    if (processedValues["returnUrl"]?.startsWith("/")) {
                        processedValues["returnUrl"] =
                            window.location.origin +
                            processedValues["returnUrl"];
                        requestValues["returnUrl"] =
                            processedValues["returnUrl"];
                    }
                    const encodedValues = urlEncodeData(
                        processedValues,
                        endpoint.requestData,
                    );
                    if (endpoint.signatureMethod && signatureField) {
                        const { signature, rawString } =
                            await generateSignature(
                                encodedValues,
                                endpoint.requestData,
                                endpoint.signatureMethod,
                                securityContext,
                            );
                        processedValues[signatureField.name] = signature;
                        encodedValues[signatureField.name] = signature;
                        requestValues[signatureField.name] = signature;
                        signatureRawString = rawString;
                    }
                    jsonResult = Object.entries(encodedValues)
                        .map(([k, v]) => `${k}=${v}`)
                        .join("\n");
                } else {
                    const encodedValues = urlEncodeData(
                        processedValues,
                        endpoint.requestData,
                    );
                    const valForSig =
                        endpoint.method === "POST" &&
                        endpoint.config?.contentType ===
                            "application/x-www-form-urlencoded"
                            ? encodedValues
                            : processedValues;
                    if (endpoint.signatureMethod && signatureField) {
                        const { signature, rawString } =
                            await generateSignature(
                                valForSig,
                                endpoint.requestData,
                                endpoint.signatureMethod,
                                securityContext,
                            );
                        processedValues[signatureField.name] = signature;
                        requestValues[signatureField.name] = signature;
                        signatureRawString = rawString;
                    }
                    jsonResult =
                        endpoint.config?.contentType ===
                        "application/x-www-form-urlencoded"
                            ? Object.entries(
                                  urlEncodeData(
                                      processedValues,
                                      endpoint.requestData,
                                  ),
                              )
                                  .map(([k, v]) => `${k}=${v}`)
                                  .join("\n")
                            : JSON.stringify(processedValues, null, 2);
                }
                executionStage = "EXECUTE";
                scrollToBottom();
            } catch (e) {
                responseResult =
                    "Error during preparation: " + (e as Error).message;
            }
        } else {
            isExecuting = true;
            responseResult = "";
            responseStatus = null;
            executionService.saveLastUsed(endpoint.id, {
                ...requestValues,
                domainPrefix: selectedDomainPrefix,
            });

            if (endpoint.requestType === "FORM") {
                try {
                    const popupName = `wpay_popup_${Date.now()}`;
                    wpayExecutionService.openPopup(451, 908, popupName);
                    const fullUrl = `${selectedDomainPrefix}${endpoint.scope.site ? "/" + endpoint.scope.site : ""}${endpoint.uri}`;
                    const payload = urlEncodeData(
                        encryptData(
                            requestValues,
                            endpoint.requestData,
                            securityContext,
                        ),
                        endpoint.requestData,
                    );
                    const sigField = endpoint.requestData.find(
                        (f) => f.name === "signature",
                    );
                    if (sigField)
                        payload[sigField.name] = requestValues[sigField.name];

                    wpayExecutionService.submitForm(
                        fullUrl,
                        endpoint.method || "POST",
                        popupName,
                        payload,
                    );

                    const bc = new BroadcastChannel("wpay_channel");
                    const messageHandler = (event: MessageEvent) => {
                        if (event.data?.type === "WPAY_RESULT")
                            handleWpayResult(event.data.data);
                    };
                    const handleWpayResult = (resultData: any) => {
                        responseStatus = 200;
                        responseResult = JSON.stringify(resultData, null, 2);
                        scrollToBottom();
                        validateResponse(resultData, securityContext);
                        window.removeEventListener("message", messageHandler);
                        bc.close();
                        isExecuting = false;
                    };
                    bc.onmessage = (event) => {
                        if (event.data?.type === "WPAY_RESULT")
                            handleWpayResult(event.data.data);
                    };
                    window.addEventListener("message", messageHandler);
                } catch (e) {
                    responseResult =
                        "Error opening popup: " + (e as Error).message;
                    isExecuting = false;
                }
            } else {
                // REST Execution
                try {
                    let fullUrl = `${selectedDomainPrefix}${endpoint.scope.site ? "/" + endpoint.scope.site : ""}${endpoint.uri}`;
                    let payload = encryptData(
                        requestValues,
                        endpoint.requestData,
                        securityContext,
                    );
                    const sigField = endpoint.requestData.find(
                        (f) => f.name === "signature",
                    );
                    if (sigField)
                        payload[sigField.name] = requestValues[sigField.name];

                    const headers: HeadersInit = {
                        ...Object.fromEntries(
                            endpoint.config?.customHeaders?.map((h) => [
                                h.key,
                                h.value,
                            ]) || [],
                        ),
                    };
                    if (endpoint.config?.contentType)
                        headers["Content-Type"] = endpoint.config.contentType;

                    let body: any = null;
                    if (
                        endpoint.method !== "GET" &&
                        endpoint.method !== "DELETE"
                    ) {
                        if (
                            endpoint.config?.contentType ===
                            "application/x-www-form-urlencoded"
                        ) {
                            body = new URLSearchParams(
                                Object.fromEntries(
                                    Object.entries(payload).map(([k, v]) => [
                                        k,
                                        String(v),
                                    ]),
                                ),
                            );
                        } else {
                            body = JSON.stringify(payload);
                            if (!headers["Content-Type"])
                                headers["Content-Type"] = "application/json";
                        }
                    } else {
                        const qp = new URLSearchParams(
                            Object.fromEntries(
                                Object.entries(payload).map(([k, v]) => [
                                    k,
                                    String(v),
                                ]),
                            ),
                        ).toString();
                        if (qp)
                            fullUrl += (fullUrl.includes("?") ? "&" : "?") + qp;
                    }

                    const response = await fetch("/api/proxy", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            url: fullUrl,
                            method: endpoint.method,
                            headers,
                            body: body?.toString() || body,
                        }),
                    });

                    responseStatus = response.status;
                    const text = await response.text();
                    try {
                        const data = JSON.parse(text);
                        responseResult = JSON.stringify(data, null, 2);
                        validateResponse(data, securityContext);
                    } catch {
                        responseResult = text;
                    }
                    scrollToBottom();
                } catch (e) {
                    responseResult = "Error: " + (e as Error).message;
                } finally {
                    isExecuting = false;
                }
            }
        }
    }

    function processResponseData(
        data: any,
        fields: ResponseDataField[],
        context: SecurityContext,
        prefix = "",
    ): { name: string; value: string; original: string; type: string }[] {
        let results: {
            name: string;
            value: string;
            original: string;
            type: string;
        }[] = [];

        if (!data || typeof data !== "object") return results;

        for (const field of fields) {
            const val = data[field.name];
            const currentName = prefix ? `${prefix}.${field.name}` : field.name;

            if (val === undefined || val === null) continue;

            if (
                field.type === "List" &&
                field.subFields &&
                Array.isArray(val)
            ) {
                val.forEach((item, idx) => {
                    results.push(
                        ...processResponseData(
                            item,
                            field.subFields!,
                            context,
                            `${currentName}[${idx}]`,
                        ),
                    );
                });
            } else if (field.decoded || field.encrypt) {
                let processed = String(val);
                const types: string[] = [];

                if (field.decoded) {
                    processed = urlDecodeString(processed);
                    types.push("URL Decoded");
                }

                if (field.encrypt) {
                    processed = decryptString(processed, context);
                    types.push("Decrypted");
                }

                if (types.length > 0) {
                    results.push({
                        name: currentName,
                        original: String(val),
                        value: processed,
                        type: types.join(" + "),
                    });
                }
            }
        }

        return results;
    }

    async function validateResponse(
        data: Record<string, any>,
        context: SecurityContext,
    ) {
        if (!endpoint) return;
        const signatureField = endpoint.responseData.find(
            (f) => f.name === "signature",
        );
        const receivedSignature = data["signature"];

        if (signatureField && receivedSignature && endpoint.signatureMethod) {
            const { signature, rawString } = await generateSignature(
                data,
                endpoint.responseData,
                endpoint.signatureMethod,
                context,
            );
            responseSignatureRawString = rawString;
            responseCalculatedSignature = signature;
            responseValidationSuccess = signature === receivedSignature;
        }

        responseDecryptedData = processResponseData(
            data,
            endpoint.responseData,
            context,
        );
    }

    // Sync Handlers
    async function handleSyncAction(action: "backup" | "restore") {
        if (!$authStore.accessToken) {
            try {
                await loginWithGoogle();
                if (!$authStore.accessToken) return;
            } catch (e) {
                console.error("Login failed", e);
                return;
            }
        }
        try {
            if (action === "backup") {
                isBackingUp = true;
                await syncService.saveToDrive();
                syncAlertTitle = "Backup Successful";
                syncAlertMessage = "Backup completed!";
            } else {
                isRestoring = true;
                await syncService.loadFromDrive($authStore.accessToken);
                syncAlertTitle = "Restore Successful";
                syncAlertMessage =
                    "Restore completed! (Re-open modal to see updates)";
            }
        } catch (e: any) {
            if (e.message?.includes("401")) disconnectGoogle();
            syncAlertTitle = "Action Failed";
            syncAlertMessage = "Error: " + (e.message || e);
        } finally {
            isBackingUp = isRestoring = false;
            showSyncAlert = true;
        }
    }

    // Observer for Header visibility removed

    // FAB State
    let isFabMenuOpen = $state(false);
    let isPresetMenuOpen = $state(false);
    let longPressTimer: any;
    let isLongPress = false;

    function handleFabStart(e: PointerEvent) {
        if (isExecuting) return;
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            isFabMenuOpen = true;
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    }

    function handleFabEnd(e: PointerEvent) {
        clearTimeout(longPressTimer);

        if (isLongPress) return;

        if (isFabMenuOpen) {
            isFabMenuOpen = false;
            return;
        }

        if (isPresetMenuOpen) {
            isPresetMenuOpen = false;
            return;
        }

        // Normal Click
        handleExecute();
    }
</script>

{#snippet fabOverlay()}
    {#if !isButtonInView && endpoint}
        <div
            class="absolute bottom-4 right-4 z-50 flex flex-col gap-3 items-center"
            transition:scale={{ duration: 200, start: 0.8 }}
        >
            {#if isFabMenuOpen}
                <button
                    onclick={() => {
                        scrollToTop();
                        isFabMenuOpen = false;
                    }}
                    transition:slide={{ axis: "y", duration: 200 }}
                    class="h-9 w-9 rounded-full shadow-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                    title="Scroll to Top"
                >
                    <ArrowUp size={16} />
                </button>
                <button
                    onclick={() => {
                        handleSyncAction("restore");
                        isFabMenuOpen = false;
                    }}
                    transition:slide={{ axis: "y", duration: 200 }}
                    class="h-9 w-9 rounded-full shadow-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700"
                    title="Restore from Drive"
                >
                    <CloudDownload size={16} />
                </button>
                <button
                    onclick={() => {
                        handleSyncAction("backup");
                        isFabMenuOpen = false;
                    }}
                    transition:slide={{ axis: "y", duration: 200 }}
                    class="h-9 w-9 rounded-full shadow-lg bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-200 dark:border-slate-700"
                    title="Backup to Drive"
                >
                    <CloudUpload size={16} />
                </button>
                <button
                    onclick={() => {
                        isPresetMenuOpen = true;
                        isFabMenuOpen = false;
                    }}
                    transition:slide={{ axis: "y", duration: 200 }}
                    class="h-9 w-9 rounded-full shadow-lg bg-amber-50 dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:bg-amber-100 dark:hover:bg-slate-700 border border-amber-200 dark:border-slate-700"
                    title="Presets"
                >
                    <Bookmark size={16} />
                </button>
            {/if}

            <button
                onpointerdown={handleFabStart}
                onpointerup={handleFabEnd}
                onpointerleave={() => clearTimeout(longPressTimer)}
                disabled={isExecuting}
                class="h-12 w-12 rounded-full shadow-2xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100 {isFabMenuOpen ||
                isPresetMenuOpen
                    ? 'bg-slate-600 hover:bg-slate-700'
                    : executionStage === 'READY'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/40'
                      : 'bg-green-600 hover:bg-green-700 shadow-green-600/40'}"
                title={isFabMenuOpen
                    ? "Close Menu"
                    : executionStage === "READY"
                      ? "Execute (Long press for menu)"
                      : "Execute"}
            >
                {#if isExecuting}
                    <Loader2 size={20} class="animate-spin" />
                {:else if isFabMenuOpen || isPresetMenuOpen}
                    <X size={20} />
                {:else if executionStage === "READY"}
                    <Check size={20} strokeWidth={3} />
                {:else}
                    <Play size={20} fill="currentColor" />
                {/if}
            </button>
        </div>

        {#if isPresetMenuOpen}
            <div
                class="absolute bottom-20 right-4 z-50 w-64 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                transition:scale={{ duration: 150, start: 0.9 }}
            >
                <div class="p-2 max-h-[200px] overflow-y-auto">
                    {#if presets.length > 0}
                        <div
                            class="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                        >
                            Saved Presets
                        </div>
                        {#each presets as preset}
                            <div
                                class="flex items-center justify-between group/item hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-2 py-1.5"
                            >
                                <button
                                    onclick={() => {
                                        const base = initializeValues(
                                            endpoint.requestData,
                                        );
                                        requestValues = {
                                            ...base,
                                            ...preset.values,
                                        };
                                        if (preset.domainPrefix)
                                            selectedDomainPrefix =
                                                preset.domainPrefix;
                                        handleUserChange();
                                        isPresetMenuOpen = false;
                                    }}
                                    class="flex-1 text-left text-sm text-slate-700 dark:text-slate-200 truncate pr-2"
                                >
                                    {preset.name}
                                </button>
                                <button
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        executionService.deletePreset(
                                            endpoint.id,
                                            preset.id,
                                        );
                                        presets = executionService.getHistory(
                                            endpoint.id,
                                        ).presets;
                                    }}
                                    class="text-slate-400 hover:text-red-500 p-1"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        {/each}
                    {:else}
                        <div
                            class="px-4 py-8 text-center text-xs text-slate-400"
                        >
                            No presets saved
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    {/if}
{/snippet}

<Modal
    bind:isOpen
    title="Execute Endpoint"
    width="max-w-4xl"
    bodyClass="max-h-[85vh] overflow-y-auto p-0 scroll-smooth"
    overlay={fabOverlay}
>
    {#if endpoint}
        <ExecutionSettings
            {endpoint}
            bind:selectedDomainPrefix
            {availableDomains}
            {presets}
            {isExecuting}
            {executionStage}
            {isBackingUp}
            {isRestoring}
            isMobile={window.innerWidth < 768}
            bind:isButtonInView
            onBackup={() => handleSyncAction("backup")}
            onRestore={() => handleSyncAction("restore")}
            onLoadPreset={(p: ExecutionPreset) => {
                const base = initializeValues(endpoint.requestData);
                requestValues = { ...base, ...p.values };
                if (p.domainPrefix) selectedDomainPrefix = p.domainPrefix;
                handleUserChange();
            }}
            onDeletePreset={(id: string) => {
                executionService.deletePreset(endpoint.id, id);
                presets = executionService.getHistory(endpoint.id).presets;
            }}
            onSavePreset={(name: string) => {
                executionService.savePreset(endpoint.id, name, {
                    ...requestValues,
                    domainPrefix: selectedDomainPrefix,
                });
                presets = executionService.getHistory(endpoint.id).presets;
            }}
            onReset={() => {
                requestValues = initializeValues(endpoint.requestData);
                handleUserChange();
            }}
            onExecute={handleExecute}
            onClose={() => (isOpen = false)}
        />

        <div
            class="p-0 md:p-6 flex flex-col gap-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/50"
        >
            <ExecutionParameterForm
                fields={endpoint.requestData}
                bind:values={requestValues}
                onUserChange={handleUserChange}
                {getOptions}
                bind:activeDropdownPath
            />

            <ExecutionResultView
                {signatureRawString}
                {jsonResult}
                {responseResult}
                {responseStatus}
                {executionStage}
                {responseValidationSuccess}
                {responseSignatureRawString}
                {responseCalculatedSignature}
                {responseDecryptedData}
            />
        </div>
    {/if}
</Modal>

<AlertModal
    bind:isOpen={showSyncAlert}
    title={syncAlertTitle}
    message={syncAlertMessage}
/>
