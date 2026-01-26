<script lang="ts">
    import { untrack, tick } from "svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import { syncService } from "$lib/features/drive/services/syncService";
    import {
        authStore,
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
        type SecurityContext,
    } from "$lib/utils/security";
    import type { Endpoint, RequestDataField } from "$lib/types/endpoint";
    import { Code } from "lucide-svelte";

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

    let headerRef = $state<HTMLElement | null>(null);
    let isHeaderInView = $state(true);

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
        if (headerRef?.parentElement) {
            headerRef.parentElement.scrollTo({
                top: headerRef.parentElement.scrollHeight,
                behavior: "smooth",
            });
        }
    }

    function scrollToTop() {
        if (headerRef?.parentElement) {
            headerRef.parentElement.scrollTo({
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
            if (field.subFields) {
                values[field.name] =
                    field.type === "List"
                        ? []
                        : initializeValues(field.subFields);
            } else {
                values[field.name] =
                    field.defaultValue ||
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

        const fieldsToProcess = endpoint.responseData.filter(
            (f) => (f.decoded || f.encrypt) && data[f.name],
        );
        if (fieldsToProcess.length > 0) {
            const decodedMap = urlDecodeData(data, fieldsToProcess);
            const decryptedMap = decryptData(
                decodedMap,
                fieldsToProcess,
                context,
            );
            responseDecryptedData = fieldsToProcess.map((f) => ({
                name: f.name,
                original: String(data[f.name]),
                value: String(decryptedMap[f.name]),
                type: [f.decoded && "URL Decoded", f.encrypt && "Decrypted"]
                    .filter(Boolean)
                    .join(" + "),
            }));
        } else {
            responseDecryptedData = [];
        }
    }

    // Sync Handlers
    async function handleSyncAction(action: "backup" | "restore") {
        if (!$authStore.accessToken) {
            syncAlertTitle = "Authentication Required";
            syncAlertMessage = "Google Drive connection required.";
            showSyncAlert = true;
            return;
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
</script>

<Modal
    bind:isOpen
    title={isHeaderInView
        ? window.innerWidth < 768
            ? ""
            : "Execute Endpoint"
        : "Execute Endpoint"}
    width="max-w-4xl"
    bodyClass="max-h-[85vh] overflow-y-auto p-0 scroll-smooth"
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
            {isHeaderInView}
            bind:headerRef
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
