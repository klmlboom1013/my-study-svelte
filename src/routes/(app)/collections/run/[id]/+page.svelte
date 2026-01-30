<script lang="ts">
    import { page } from "$app/stores";
    import { settingsStore } from "$lib/stores/settingsStore";
    import { endpointService } from "$lib/features/endpoints/services/endpointService";
    import { driveService } from "$lib/features/drive/services/driveService";
    import {
        collectionExecutionService,
        type CollectionStepExecution,
        type CollectionExecutionPreset,
    } from "$lib/features/execution/services/collectionExecutionService";
    import { executionService } from "$lib/features/execution/services/executionService";
    import { wpayExecutionService } from "$lib/features/execution/services/wpayExecutionService";
    import {
        authStore,
        loginWithGoogle,
    } from "$lib/features/auth/services/authService";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { get } from "svelte/store";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import { tick } from "svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import {
        Play,
        RotateCcw,
        Save,
        History,
        ChevronRight,
        CheckCircle2,
        Circle,
        Loader2,
        AlertCircle,
        ArrowLeft,
        ChevronDown,
        ChevronUp,
        Zap,
        Code,
        Eye,
        Plus,
        Trash2,
        Bookmark,
        X,
        Check,
        ArrowUp,
        FolderOpen,
        Menu,
        CloudUpload,
        CloudDownload,
    } from "lucide-svelte";
    import { slide, fade, scale } from "svelte/transition";
    import ExecutionParameterForm from "$lib/components/endpoint/ExecutionParameterForm.svelte";
    import ExecutionResultView from "$lib/components/endpoint/ExecutionResultView.svelte";
    import {
        encryptData,
        generateSignature,
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
    import AlertModal from "$lib/components/ui/AlertModal.svelte";

    const id = $derived($page.params.id);
    const collection = $derived(
        $settingsStore.apiCollections?.find((c) => c.id === id),
    );

    // State
    let stepsExecution = $state<CollectionStepExecution[]>([]);
    let activeStepIndex = $state(0);
    let isExecuting = $state(false);
    let selectedDomainPrefixes = $state<Record<string, string>>({});
    let popupWindow: Window | null = null; // Plain variable to avoid proxying

    // Run All Control State
    let isRunningAll = $state(false);
    let stopRequested = $state(false);

    function signalClosePopup() {
        if (!popupWindow) return;
        try {
            const bc = new BroadcastChannel("wpay_channel");
            bc.postMessage({ type: "WPAY_CLOSE" });
            bc.close();
            // Direct reference close as fallback
            if (popupWindow && !popupWindow.closed) {
                popupWindow.close();
            }
        } catch (e) {
            console.error("Failed to signal close to popup:", e);
        }
        popupWindow = null;
    }

    function handleStop() {
        stopRequested = true;
        signalClosePopup();
    }

    // History/Preset UI State
    let isPresetDropdownOpen = $state(false);
    let showSavePresetDialog = $state(false);
    let showLoadPresetDialog = $state(false);
    let newPresetName = $state("");
    let collectionPresets = $state<CollectionExecutionPreset[]>([]);
    let activeDropdownPath = $state("");

    // Alert Modal State
    let isAlertOpen = $state(false);
    let alertTitle = $state("");
    let alertMessage = $state("");

    // FAB State
    let isFabMenuOpen = $state(false);
    let isButtonInView = $state(true);
    let bottomAnchor = $state<HTMLElement | null>(null);

    let alertType = $state<"alert" | "confirm">("alert");
    let onAlertConfirm = $state<(() => void) | undefined>(undefined);
    let onAlertCancel = $state<(() => void) | undefined>(undefined);

    function showAlert(title: string, message: string) {
        alertTitle = title;
        alertMessage = message;
        alertType = "alert";
        onAlertConfirm = undefined;
        isAlertOpen = true;
    }

    function showConfirmPromise(
        title: string,
        message: string,
    ): Promise<boolean> {
        return new Promise((resolve) => {
            alertTitle = title;
            alertMessage = message;
            alertType = "confirm";
            onAlertConfirm = () => resolve(true);
            onAlertCancel = () => resolve(false);
            isAlertOpen = true;
        });
    }

    let syncState = $state<"idle" | "backup" | "restore">("idle");

    async function executeWithRetry(
        operationName: string,
        action: (token: string) => Promise<void>,
        targetState: "backup" | "restore",
    ) {
        if (syncState !== "idle") return;
        syncState = targetState;

        let token = $authStore.accessToken;

        try {
            // First attempt
            if (!token) {
                // If no token immediately, try login first
                const result = await loginWithGoogle();
                token = result.token;
            }

            if (!token) throw new Error("Failed to retrieve access token.");

            // Perform action
            await action(token);
        } catch (error: any) {
            // Check for 401 Unauthorized or specific Drive API error indicating invalid credentials
            const isAuthError =
                error.message.includes("401") ||
                error.message.includes("Invalid Credentials") ||
                error.message.includes("unauthorized");

            if (isAuthError) {
                try {
                    // Retry: Force login to get fresh token
                    const result = await loginWithGoogle();
                    token = result.token;

                    if (!token)
                        throw new Error(
                            "Failed to retrieve access token on retry.",
                        );

                    // Retry action
                    await action(token);
                } catch (retryError: any) {
                    console.error("Retry failed:", retryError);
                    showAlert(
                        `${operationName} Failed`,
                        `Authentication failed. Please try logging in again.\nError: ${retryError.message}`,
                    );
                }
            } else {
                // Not an auth error, just fail
                console.error(error);
                showAlert(`${operationName} Failed`, `Error: ${error.message}`);
            }
        } finally {
            syncState = "idle";
        }
    }

    function observerAction(
        node: HTMLElement,
        action: (node: HTMLElement) => any,
    ) {
        const res = action(node);
        return res;
    }

    // Initialize logic
    $effect(() => {
        if (collection) {
            const history = collectionExecutionService.getHistory(
                collection.id,
            );
            collectionPresets = history.presets;

            if (stepsExecution.length === 0) {
                const lastUsed = history.lastUsed;
                stepsExecution =
                    collection.steps?.map((step) => {
                        const lastStepData = lastUsed?.steps?.find(
                            (s) => s.stepId === step.id,
                        );

                        let baseValues;
                        if (lastStepData) {
                            if (lastStepData.domainPrefix) {
                                selectedDomainPrefixes[step.id] =
                                    lastStepData.domainPrefix;
                            }
                            baseValues = { ...lastStepData.requestValues };
                        } else {
                            const endpoint = endpointService.getEndpoint(
                                step.endpointId,
                            );
                            baseValues = initializeValues(
                                endpoint?.requestData,
                            );
                        }

                        // Clear signature if present in values
                        const endpoint = endpointService.getEndpoint(
                            step.endpointId,
                        );
                        const signatureField = endpoint?.requestData.find(
                            (f) => f.name === "signature",
                        );
                        if (signatureField && baseValues[signatureField.name]) {
                            baseValues[signatureField.name] = "";
                        }

                        return {
                            stepId: step.id,
                            endpointId: step.endpointId,
                            requestValues: baseValues,
                            status: "READY",
                            sentRequest: undefined,
                            signatureSourceString: undefined,
                            error: undefined,
                            result: undefined,
                        };
                    }) || [];

                // Set initial domain prefixes if not from lastUsed
                collection.steps?.forEach((step) => {
                    if (!selectedDomainPrefixes[step.id]) {
                        selectedDomainPrefixes[step.id] = getInitialDomain(
                            step.endpointId,
                        );
                    }
                });
            }
        }
    });

    function getInitialDomain(endpointId: string) {
        const domains = getMergedDomains(endpointId);
        if (domains) {
            return (
                domains.dev ||
                domains.stg ||
                domains.pGlb ||
                domains.pKs ||
                domains.pFc ||
                ""
            );
        }
        return "";
    }

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

    function getOptions(endpointId: string, field: RequestDataField) {
        const endpoint = endpointService.getEndpoint(endpointId);
        if (!endpoint || !field.name) return [];
        const options: { value: string; label: string; source: string }[] = [];
        const app = endpoint.application;
        const service = endpoint.scope.service;

        const globalParameters =
            $settingsStore.endpoint_parameters.globalParameters;
        const parameterOptions =
            $settingsStore.endpoint_parameters.parameterOptions;
        const midContexts = $settingsStore.endpoint_parameters.midContexts;

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

    function generateRandomValue(type: string, length: number) {
        const charsetMap: Record<string, string> = {
            alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
            numeric: "0123456789",
            alphanumeric:
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        };
        const charset = charsetMap[type] || charsetMap.alphanumeric;
        let result = "";
        for (let i = 0; i < length; i++) {
            result += charset.charAt(
                Math.floor(Math.random() * charset.length),
            );
        }
        return result;
    }

    // Apply mappings for a step
    function applyMappings(index: number) {
        if (!collection || !collection.steps) return;
        const step = collection.steps[index];
        if (!step || !step.requestMappings) return;

        const currentExec = stepsExecution[index];
        const newValues = { ...currentExec.requestValues };

        step.requestMappings.forEach((mapping) => {
            if (mapping.source === "variable") {
                // value is stepId.fieldPath
                const [targetStepId, ...pathParts] = mapping.value.split(".");
                const targetStepExec = stepsExecution.find(
                    (s) => s.stepId === targetStepId,
                );

                if (targetStepExec) {
                    let val;
                    // Priority 1: Use processed (decrypted/decoded) result if available
                    if (targetStepExec.processedResult) {
                        const path = pathParts.join(".");
                        const processed = targetStepExec.processedResult[path];
                        if (
                            processed &&
                            typeof processed === "object" &&
                            "value" in processed
                        ) {
                            val = processed.value;
                        }
                    }

                    // Priority 2: Fallback to raw result
                    if (val === undefined && targetStepExec.result) {
                        val = getNestedValue(
                            targetStepExec.result,
                            pathParts.join("."),
                        );
                    }

                    if (val !== undefined)
                        setNestedValue(newValues, mapping.fieldPath, val);
                }
            } else if (mapping.source === "random") {
                const [type, lenStr] = mapping.value.split(":");
                const length = parseInt(lenStr) || 8;
                const val = generateRandomValue(type, length);
                setNestedValue(newValues, mapping.fieldPath, val);
            }
        });

        stepsExecution[index].requestValues = newValues;
        resetStepExecution(index);
    }

    function setNestedValue(obj: any, path: string, value: any) {
        const parts = path.split(".");
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) current[part] = {};
            current = current[part];
        }
        current[parts[parts.length - 1]] = value;
    }

    function getNestedValue(obj: any, path: string) {
        return path.split(".").reduce((prev, curr) => prev?.[curr], obj);
    }

    function resetStepExecution(index: number) {
        if (!stepsExecution[index]) return;

        const stepExec = stepsExecution[index];
        stepExec.sentRequest = undefined;
        stepExec.signatureSourceString = undefined;
        stepExec.result = undefined;
        stepExec.error = undefined;
        stepExec.status = "READY";

        // Clear signature field in requestValues
        const endpoint = endpointService.getEndpoint(stepExec.endpointId);
        if (endpoint) {
            const signatureField = endpoint.requestData.find(
                (f) => f.name === "signature",
            );
            if (signatureField) {
                stepExec.requestValues[signatureField.name] = "";
            }
        }
    }

    async function scrollToBottom() {
        await tick();
        setTimeout(() => {
            // Priority 1: Use anchor (most reliable for nested scrolls)
            if (bottomAnchor) {
                bottomAnchor.scrollIntoView({
                    behavior: "smooth",
                    block: "end",
                });
            } else {
                // Priority 2: Target main container explicitly
                const main = document.querySelector("main.overflow-y-auto");
                if (main) {
                    main.scrollTo({
                        top: main.scrollHeight,
                        behavior: "smooth",
                    });
                }
            }
        }, 100);
    }

    function scrollToTop() {
        const main = document.querySelector("main.overflow-y-auto");
        if (main) {
            main.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } else {
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        }
    }

    function processResponseData(index: number) {
        const stepExec = stepsExecution[index];
        const endpoint = endpointService.getEndpoint(stepExec.endpointId);
        if (!endpoint || !stepExec.result) {
            stepExec.processedResult = undefined;
            return;
        }

        const midValue = stepExec.requestValues["mid"];
        let securityContext: SecurityContext = {};
        if (midValue) {
            const midCtx = $settingsStore.endpoint_parameters.midContexts.find(
                (c) => c.mid === midValue,
            );
            if (midCtx)
                securityContext = {
                    hashKey: midCtx.hashKey,
                    encKey: midCtx.encKey,
                    encIV: midCtx.encIV,
                };
        }

        let resultObj: any = {};
        if (typeof stepExec.result === "string") {
            try {
                resultObj = JSON.parse(stepExec.result);
            } catch {
                // If it's not JSON, we might still want to process if it's a KV string,
                // but usually responseDefinitions assume JSON mapping for collections.
                stepExec.processedResult = undefined;
                return;
            }
        } else {
            resultObj = stepExec.result;
        }

        const processed: Record<string, any> = {};
        const respFields = endpoint.responseData || [];

        for (const field of respFields) {
            const val = resultObj[field.name];
            if (val === undefined || val === null) continue;

            let processedVal = String(val);
            let isProcessed = false;
            let decoded = false;
            let decrypted = false;

            if (field.decoded) {
                processedVal = urlDecodeString(processedVal);
                isProcessed = true;
                decoded = true;
            }

            if (field.encrypt) {
                processedVal = decryptString(processedVal, securityContext);
                isProcessed = true;
                decrypted = true;
            }

            if (isProcessed) {
                processed[field.name] = {
                    value: processedVal,
                    decoded,
                    decrypted,
                };
            }
        }

        stepExec.processedResult =
            Object.keys(processed).length > 0 ? processed : undefined;
    }

    async function executeStep(
        index: number,
        autoRun = false,
        executionId = "manual_run",
        popupNameOverride?: string,
    ) {
        const stepExec = stepsExecution[index];
        const endpoint = endpointService.getEndpoint(stepExec.endpointId);
        if (!endpoint) return;

        // Check cancellation
        if (stopRequested) return;

        // Apply mappings before execution ONLY if we are not already in SUCCESS state (Prepared/Done)
        if (stepExec.status !== "SUCCESS") {
            applyMappings(index);
        }

        // 1. Preparation Phase (If READY)
        if (stepExec.status === "READY") {
            const midValue = stepExec.requestValues["mid"];
            let securityContext: SecurityContext = {};
            if (midValue) {
                const midCtx =
                    $settingsStore.endpoint_parameters.midContexts.find(
                        (c) => c.mid === midValue,
                    );
                if (midCtx)
                    securityContext = {
                        hashKey: midCtx.hashKey,
                        encKey: midCtx.encKey,
                        encIV: midCtx.encIV,
                    };
            }

            try {
                let processedValues = encryptData(
                    { ...stepExec.requestValues },
                    endpoint.requestData,
                    securityContext,
                );
                const signatureField = endpoint.requestData.find(
                    (f) => f.name === "signature",
                );

                if (endpoint.requestType === "FORM") {
                    if (stepExec.requestValues["returnUrl"]) {
                        try {
                            const url = new URL(
                                stepExec.requestValues["returnUrl"],
                                window.location.origin,
                            );
                            url.searchParams.set("isSession", "true");
                            stepExec.requestValues["returnUrl"] =
                                url.toString();
                        } catch (e) {
                            // Fallback if not a valid full URL
                            const char = stepExec.requestValues[
                                "returnUrl"
                            ].includes("?")
                                ? "&"
                                : "?";
                            if (
                                !stepExec.requestValues["returnUrl"].includes(
                                    "isSession=true",
                                )
                            ) {
                                stepExec.requestValues["returnUrl"] +=
                                    `${char}isSession=true`;
                            }
                        }
                    }

                    const encodedValues = urlEncodeData(
                        encryptData(
                            { ...stepExec.requestValues },
                            endpoint.requestData,
                            securityContext,
                        ),
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
                        stepExec.requestValues[signatureField.name] = signature;
                        stepExec.signatureSourceString = rawString;
                        encodedValues[signatureField.name] = signature;
                    }

                    stepExec.sentRequest = Object.entries(encodedValues)
                        .map(([k, v]) => `${k}=${v}`)
                        .join("\n");
                } else {
                    const valForSig =
                        endpoint.method === "POST" &&
                        endpoint.config?.contentType ===
                            "application/x-www-form-urlencoded"
                            ? urlEncodeData(
                                  processedValues,
                                  endpoint.requestData,
                              )
                            : processedValues;
                    if (endpoint.signatureMethod && signatureField) {
                        const { signature, rawString } =
                            await generateSignature(
                                valForSig,
                                endpoint.requestData,
                                endpoint.signatureMethod,
                                securityContext,
                            );
                        stepExec.requestValues[signatureField.name] = signature;
                        stepExec.signatureSourceString = rawString;
                        if (
                            typeof valForSig === "object" &&
                            !Array.isArray(valForSig)
                        ) {
                            (processedValues as any)[signatureField.name] =
                                signature;
                        }
                    }

                    if (
                        endpoint.config?.contentType ===
                        "application/x-www-form-urlencoded"
                    ) {
                        const encoded = urlEncodeData(
                            processedValues,
                            endpoint.requestData,
                        );
                        stepExec.sentRequest = Object.entries(encoded)
                            .map(([k, v]) => `${k}=${v}`)
                            .join("\n");
                    } else {
                        stepExec.sentRequest = JSON.stringify(
                            processedValues,
                            null,
                            2,
                        );
                    }
                }
                stepExec.status = "SUCCESS"; // Change status to SUCCESS to show Execute button
                await scrollToBottom();
                if (!autoRun) return;
            } catch (e) {
                stepExec.status = "ERROR";
                stepExec.error = "Preparation error: " + (e as Error).message;
                return;
            }
        }

        // 2. Execution Phase
        stepExec.status = "EXECUTING";
        isExecuting = true;

        const executeMidValue = stepExec.requestValues["mid"];
        let executeSecurityContext: SecurityContext = {};
        if (executeMidValue) {
            const midCtx = $settingsStore.endpoint_parameters.midContexts.find(
                (c) => c.mid === executeMidValue,
            );
            if (midCtx)
                executeSecurityContext = {
                    hashKey: midCtx.hashKey,
                    encKey: midCtx.encKey,
                    encIV: midCtx.encIV,
                };
        }

        try {
            const domain = selectedDomainPrefixes[stepExec.stepId];
            let fullUrl = `${domain}${endpoint.scope.site ? "/" + endpoint.scope.site : ""}${endpoint.uri}`;

            if (endpoint.requestType === "FORM") {
                // Determine popup name: override (Run All) or new unique (Manual)
                const popupName =
                    popupNameOverride ||
                    `col_run_${executionId}_step_${index}_${Date.now()}`;

                // Handle Popup:
                // If manual run, open new.
                // If auto run (override provided), we assume global popup matches this name or we just use the name for targeting.
                // CRITICAL: For auto-run, we depend on the handleRunAll to have opened the popup.
                if (!popupNameOverride) {
                    // Manual run: Open fresh popup
                    popupWindow = wpayExecutionService.openPopup(
                        451,
                        908,
                        popupName,
                    );

                    if (!popupWindow) {
                        stepExec.status = "SUCCESS";
                        isExecuting = false;
                        showAlert(
                            "Popup Blocked",
                            "The browser blocked the popup. Please click manually.",
                        );
                        return;
                    }
                } else {
                    // Auto run: Reuse existing global popup
                    if (!popupWindow || popupWindow.closed) {
                        console.warn(
                            `Step ${index}: Global popup is closed or missing. Attempting to reopen...`,
                        );
                        popupWindow = wpayExecutionService.openPopup(
                            451,
                            908,
                            popupName,
                        );
                    }
                }

                if (!popupWindow) {
                    // Final check: If still no window, we are blocked.
                    console.error(
                        "Popup Blocked: No window reference available.",
                    );
                    stepExec.status = "SUCCESS"; // Mark as success to stop spinning? Or FAIL?
                    isExecuting = false;
                    showAlert(
                        "Popup Blocked",
                        "Browser blocked popup. Please allow popups.",
                    );
                    return;
                }

                // CRITICAL: Explicitly set the window name if we have access
                // This fixes "About:Blank" issues by reclaiming the window reference
                if (popupWindow && !popupWindow.closed) {
                    try {
                        // Accessing .name on cross-origin might fail, wrap in try-catch
                        popupWindow.name = popupName;
                    } catch (e) {
                        console.warn(
                            "Could not set popup window name (Cross-Origin?):",
                            e,
                        );
                    }
                }

                // Prepare payload
                const payload = urlEncodeData(
                    encryptData(
                        { ...stepExec.requestValues },
                        endpoint.requestData,
                        executeSecurityContext,
                    ),
                    endpoint.requestData,
                );

                const sigField = endpoint.requestData.find(
                    (f) => f.name === "signature",
                );
                if (sigField) {
                    payload[sigField.name] =
                        stepExec.requestValues[sigField.name];
                }

                stepExec.sentRequest = Object.entries(payload)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("\n");

                await scrollToBottom();

                // Wait for broadcast
                const resultPromise = new Promise((resolve, reject) => {
                    const bc = new BroadcastChannel("wpay_channel");
                    const handler = (event: MessageEvent) => {
                        if (event.data?.type === "WPAY_RESULT") {
                            bc.close();
                            window.removeEventListener("message", handler);
                            resolve(event.data.data);
                        } else if (event.data?.type === "WPAY_CLOSE") {
                            bc.close();
                            window.removeEventListener("message", handler);
                            reject(new Error("EXECUTION_STOPPED"));
                        }
                    };
                    bc.onmessage = handler;
                    window.addEventListener("message", handler);
                });

                // Small delay to let popup attach listener
                await new Promise((r) => setTimeout(r, 500));

                // Submit Form
                wpayExecutionService.submitForm(
                    fullUrl,
                    endpoint.method || "POST",
                    popupName,
                    payload,
                );

                try {
                    const result = await resultPromise;
                    stepExec.result = result;
                    stepExec.status = "SUCCESS";
                    processResponseData(index);
                } finally {
                    // ALWAYS close the popup after step execution (success or error)
                    // ONLY close the popup if this is a MANUAL run
                    // For Run All, we keep it open for the next step
                    if (
                        !popupNameOverride &&
                        popupWindow &&
                        !popupWindow.closed
                    ) {
                        popupWindow.close();
                    }
                }

                await scrollToBottom();
            } else {
                // REST Execution
                let execProcessedValues = encryptData(
                    { ...stepExec.requestValues },
                    endpoint.requestData,
                    executeSecurityContext,
                );
                const execSignatureField = endpoint.requestData.find(
                    (f) => f.name === "signature",
                );

                let payload = execProcessedValues;
                if (endpoint.signatureMethod && execSignatureField) {
                    const valForSig =
                        endpoint.method === "POST" &&
                        endpoint.config?.contentType ===
                            "application/x-www-form-urlencoded"
                            ? urlEncodeData(payload, endpoint.requestData)
                            : payload;
                    const { signature, rawString } = await generateSignature(
                        valForSig,
                        endpoint.requestData,
                        endpoint.signatureMethod,
                        executeSecurityContext,
                    );
                    payload[execSignatureField.name] = signature;
                    stepExec.signatureSourceString = rawString;
                }

                if (
                    endpoint.config?.contentType ===
                    "application/x-www-form-urlencoded"
                ) {
                    const encoded = urlEncodeData(
                        payload,
                        endpoint.requestData,
                    );
                    stepExec.sentRequest = Object.entries(encoded)
                        .map(([k, v]) => `${k}=${v}`)
                        .join("\n");
                } else {
                    stepExec.sentRequest = JSON.stringify(payload, null, 2);
                }

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
                if (endpoint.method !== "GET" && endpoint.method !== "DELETE") {
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
                    if (qp) fullUrl += (fullUrl.includes("?") ? "&" : "?") + qp;
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

                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    stepExec.result = data;
                    stepExec.status = response.ok ? "SUCCESS" : "ERROR";
                    if (!response.ok)
                        stepExec.error = `HTTP ${response.status}: ${text}`;
                } catch {
                    stepExec.result = text;
                    stepExec.status = response.ok ? "SUCCESS" : "ERROR";
                }
                processResponseData(index);

                // Auto-apply mappings to NEXT step if successful
                if (
                    stepExec.status === "SUCCESS" &&
                    index < stepsExecution.length - 1
                ) {
                    applyMappings(index + 1);
                }

                await scrollToBottom();
            }
        } catch (e) {
            const err = e as Error;
            if (err.message === "EXECUTION_STOPPED") {
                stepExec.status = "READY"; // Reset to ready on stop
                stepExec.error = undefined;
            } else {
                stepExec.status = "ERROR";
                stepExec.error = err.message;
            }
        } finally {
            isExecuting = false;
            collectionExecutionService.saveLastUsed(
                collection!.id,
                stepsExecution.map((s) => ({
                    ...s,
                    status: "READY",
                    result: undefined,
                    domainPrefix: selectedDomainPrefixes[s.stepId],
                })),
            );
            if (stepExec.status !== "READY") {
                await scrollToBottom();
            }
        }
    }

    async function handleRunAll() {
        if (isRunningAll) return;

        // USER REQUEST: Always start from Step 1 when "Run All" is clicked
        // Previously: Resumed from the first non-success step.
        let startIdx = 0;

        // Sync domains based on the starting step to ensure consistency
        const startStep = stepsExecution[startIdx];
        const startDomain = selectedDomainPrefixes[startStep.stepId];
        if (startStep && startDomain) {
            updateAllStepDomains(startStep.stepId, startDomain);
        }

        isRunningAll = true;
        stopRequested = false;
        const executionId = `exec_${Date.now()}`;

        try {
            for (let i = startIdx; i < stepsExecution.length; i++) {
                if (stopRequested) break;

                activeStepIndex = i;

                if (i === startIdx) {
                    // Use a generic name for the reusable popup
                    const globalPopupName = `col_run_${executionId}`;
                    popupWindow = wpayExecutionService.openPopup(
                        451,
                        908,
                        globalPopupName,
                    );
                    if (!popupWindow) {
                        showAlert(
                            "Popup Blocked",
                            "The browser blocked the initial popup. Please allow popups for this site.",
                        );
                        isRunningAll = false;
                        return;
                    }
                }

                const currentPopupName = `col_run_${executionId}`; // Consistent name for reuse

                // Small delay to let popup window stabilize/clear between steps
                if (i > startIdx) {
                    await new Promise((r) => setTimeout(r, 1000)); // Increased delay slightly
                }

                if (stopRequested) break;

                // Execute step (pass popupName to reuse)
                await executeStep(i, true, executionId, currentPopupName);

                // If an error occurred or stop was requested during execution
                if (stopRequested || stepsExecution[i].status === "ERROR") {
                    signalClosePopup(); // Close popup on error or stop
                    break;
                }
            }
        } finally {
            isRunningAll = false;
            stopRequested = false;
            setTimeout(() => {
                if (popupWindow && !popupWindow.closed) {
                    popupWindow.close();
                }
                signalClosePopup();
            }, 1000);
        }
    }

    function handleReset() {
        signalClosePopup();
        stepsExecution = stepsExecution.map((s) => ({
            ...s,
            status: "READY",
            result: undefined,
            error: undefined,
            sentRequest: undefined,
        }));
        activeStepIndex = 0;
    }

    function handleSavePreset() {
        if (!newPresetName.trim()) return;
        collectionExecutionService.savePreset(
            collection!.id,
            newPresetName,
            stepsExecution.map((s) => ({
                ...s,
                domainPrefix: selectedDomainPrefixes[s.stepId],
            })),
        );
        collectionPresets = collectionExecutionService.getHistory(
            collection!.id,
        ).presets;
        newPresetName = "";
        showSavePresetDialog = false;
    }

    function loadPreset(preset: CollectionExecutionPreset) {
        stepsExecution = preset.steps.map((s) => ({
            ...s,
            status: "READY",
            result: undefined,
            error: undefined,
            sentRequest: undefined,
        }));
        preset.steps.forEach((s) => {
            if (s.domainPrefix)
                selectedDomainPrefixes[s.stepId] = s.domainPrefix;
        });
        activeStepIndex = 0;
        isPresetDropdownOpen = false;
    }

    function deletePreset(pid: string) {
        collectionExecutionService.deletePreset(collection!.id, pid);
        collectionPresets = collectionExecutionService.getHistory(
            collection!.id,
        ).presets;
    }

    // Domain Helpers
    function getMergedDomains(endpointId: string) {
        const endpoint = endpointService.getEndpoint(endpointId);
        if (!endpoint) return null;
        const app = $settingsStore.applications.find(
            (a) => a.appName === endpoint.application,
        );
        if (!app) return null;

        // Base domains from application
        const merged = { ...(app.domains || {}) };

        // Override with service domains if specified
        if (endpoint.scope.service && app.services) {
            const svc = app.services.find(
                (s) => s.name === endpoint.scope.service,
            );
            if (svc?.domains) {
                if (svc.domains.dev) merged.dev = svc.domains.dev;
                if (svc.domains.stg) merged.stg = svc.domains.stg;
                if (svc.domains.pGlb) merged.pGlb = svc.domains.pGlb;
                if (svc.domains.pKs) merged.pKs = svc.domains.pKs;
                if (svc.domains.pFc) merged.pFc = svc.domains.pFc;
            }
        }
        return merged;
    }

    function getAvailableDomains(endpointId: string) {
        const domains = getMergedDomains(endpointId);
        const list = [];
        if (domains) {
            if (domains.dev) list.push({ label: "DEV", value: domains.dev });
            if (domains.stg) list.push({ label: "STG", value: domains.stg });
            if (domains.pGlb) list.push({ label: "pGLB", value: domains.pGlb });
            if (domains.pKs) list.push({ label: "pKS", value: domains.pKs });
            if (domains.pFc) list.push({ label: "pFC", value: domains.pFc });
        }
        return list;
    }

    function updateAllStepDomains(currentStepId: string, selectedUrl: string) {
        if (!selectedUrl) return;

        // Find which environment label this URL corresponds to for the current step
        const stepExec = stepsExecution.find((s) => s.stepId === currentStepId);
        if (!stepExec) return;

        const currentDomains = getAvailableDomains(stepExec.endpointId);
        const selectedEnv = currentDomains.find((d) => d.value === selectedUrl);
        if (!selectedEnv) return;

        // Apply the same environment label to all other steps
        stepsExecution.forEach((step) => {
            if (step.stepId === currentStepId) return;

            const stepDomains = getAvailableDomains(step.endpointId);
            const match = stepDomains.find(
                (d) => d.label === selectedEnv.label,
            );
            if (match) {
                selectedDomainPrefixes[step.stepId] = match.value;
            }
        });
    }

    async function handleBackupToDrive() {
        if (!collection) return;
        await executeWithRetry(
            "Backup",
            async (token) => {
                const filename = `collection_presets_${collection.id}.json`;
                const presetData = {
                    collectionId: collection.id,
                    presets: collectionPresets,
                    savedAt: new Date().toISOString(),
                };

                const files = await driveService.listFiles(token, filename);
                if (files.length > 0) {
                    await driveService.updateFile(
                        token,
                        files[0].id,
                        presetData,
                    );
                } else {
                    await driveService.createFile(token, filename, presetData);
                }
                showAlert("Success", "Backup successful!");
            },
            "backup",
        );
    }

    async function handleRestoreFromDrive() {
        if (!collection) return;

        const confirmed = await showConfirmPromise(
            "Confirm Restore",
            "This will merge presets from Google Drive into your local collection.\nExisting presets with the same name will be overwritten.\n\nAre you sure you want to continue?",
        );

        if (!confirmed) return;

        await executeWithRetry(
            "Restore",
            async (token) => {
                const filename = `collection_presets_${collection.id}.json`;
                const files = await driveService.listFiles(token, filename);

                if (files.length === 0) {
                    throw new Error(
                        "No backup file found for this collection.",
                    );
                }

                const data = await driveService.downloadFile(
                    token,
                    files[0].id,
                );
                if (data && Array.isArray(data.presets)) {
                    data.presets.forEach((p: any) => {
                        const existing = collectionPresets.find(
                            (ep) => ep.name === p.name,
                        );
                        if (existing) {
                            collectionExecutionService.deletePreset(
                                collection!.id,
                                existing.id,
                            );
                        }
                        collectionExecutionService.savePreset(
                            collection!.id,
                            p.name,
                            p.steps,
                        );
                    });

                    collectionPresets = collectionExecutionService.getHistory(
                        collection.id,
                    ).presets;
                    showAlert("Success", "Restore successful!");
                } else {
                    throw new Error("Invalid backup file format.");
                }
            },
            "restore",
        );
    }
</script>

<div class="max-w-screen-2xl mx-auto py-8 px-4 pb-32">
    {#if collection}
        <div class="mb-8">
            <Breadcrumbs
                items={[
                    { label: "Home", href: "/" },
                    { label: "API Collections", href: "/collections" },
                    { label: collection.name },
                ]}
            />

            <div class="mt-6">
                <div class="flex items-center gap-4">
                    <div>
                        <div class="flex items-center gap-3">
                            <h1
                                class="text-3xl font-bold text-slate-900 dark:text-white"
                            >
                                {collection.name}
                            </h1>
                            <span
                                class="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            >
                                {collection.application}
                            </span>
                        </div>
                        <p class="text-slate-500 dark:text-slate-400 mt-1">
                            Execute workflows and view sequential results.
                        </p>
                    </div>
                </div>

                <div class="flex items-center justify-end gap-2 mt-4">
                    <button
                        onclick={handleBackupToDrive}
                        disabled={syncState !== "idle" ||
                            $appStateStore.isPageLocked}
                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {#if syncState === "backup"}
                            <Loader2 size={16} class="animate-spin" />
                            <span>Wait...</span>
                        {:else}
                            <CloudUpload size={16} />
                            <span>Backup</span>
                        {/if}
                    </button>
                    <button
                        onclick={handleRestoreFromDrive}
                        disabled={syncState !== "idle" ||
                            $appStateStore.isPageLocked}
                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {#if syncState === "restore"}
                            <Loader2 size={16} class="animate-spin" />
                            <span>Wait...</span>
                        {:else}
                            <CloudDownload size={16} />
                            <span>Restore</span>
                        {/if}
                    </button>

                    <!-- Presets Dropdown -->
                    <div class="relative">
                        <button
                            onclick={() =>
                                (isPresetDropdownOpen = !isPresetDropdownOpen)}
                            class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <History size={16} />
                            <span>Presets</span>
                            <ChevronDown
                                size={14}
                                class="transition-transform {isPresetDropdownOpen
                                    ? 'rotate-180'
                                    : ''}"
                            />
                        </button>

                        {#if isPresetDropdownOpen}
                            <div
                                transition:fade={{ duration: 150 }}
                                class="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
                            >
                                <div
                                    class="p-3 border-b border-slate-100 dark:border-slate-800"
                                >
                                    <h3
                                        class="text-xs font-bold text-slate-400 uppercase tracking-widest"
                                    >
                                        Execution Presets
                                    </h3>
                                </div>
                                <div
                                    class="max-h-64 overflow-y-auto p-2 space-y-1"
                                >
                                    {#if collectionPresets.length === 0}
                                        <div
                                            class="p-4 text-center text-sm text-slate-400"
                                        >
                                            No presets saved yet.
                                        </div>
                                    {:else}
                                        {#each collectionPresets as preset}
                                            <div
                                                class="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <button
                                                    onclick={() =>
                                                        loadPreset(preset)}
                                                    class="flex-1 text-left text-sm font-medium text-slate-700 dark:text-slate-300 truncate"
                                                >
                                                    {preset.name}
                                                </button>
                                                <button
                                                    onclick={() =>
                                                        deletePreset(preset.id)}
                                                    class="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        {/each}
                                    {/if}
                                </div>
                                <div
                                    class="p-2 bg-slate-50 dark:bg-slate-800/50 mt-1"
                                >
                                    <button
                                        onclick={() => {
                                            showSavePresetDialog = true;
                                            isPresetDropdownOpen = false;
                                        }}
                                        class="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                    >
                                        <Save size={16} />
                                        <span>Save Current State</span>
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <button
                        onclick={handleReset}
                        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <RotateCcw size={16} />
                        <span>Reset</span>
                    </button>
                    <button
                        onclick={handleRunAll}
                        disabled={isExecuting || isRunningAll}
                        class="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-lg shadow-green-600/20 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {#if isExecuting || isRunningAll}
                            <Loader2 size={18} class="animate-spin" />
                            <span>Running...</span>
                        {:else}
                            <Zap size={18} fill="currentColor" />
                            <span>Run All Steps</span>
                        {/if}
                    </button>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <!-- Sidebar: Stepper -->
            <div class="lg:col-span-1 space-y-4">
                <div
                    class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sticky top-8"
                >
                    <h3
                        class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-2"
                    >
                        Workflow Progress
                    </h3>
                    <div class="space-y-2">
                        {#each stepsExecution as stepExec, idx}
                            {@const stepDef = collection.steps?.[idx]}
                            {@const endpoint = endpointService.getEndpoint(
                                stepExec.endpointId,
                            )}
                            <button
                                onclick={() => (activeStepIndex = idx)}
                                class="w-full flex items-center gap-3 p-3 rounded-xl transition-all group {activeStepIndex ===
                                idx
                                    ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/20 shadow-sm'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'}"
                            >
                                <div class="relative flex-shrink-0">
                                    {#if stepExec.status === "SUCCESS"}
                                        <CheckCircle2
                                            size={24}
                                            class="text-green-500 fill-green-500/10"
                                        />
                                    {:else if stepExec.status === "ERROR"}
                                        <AlertCircle
                                            size={24}
                                            class="text-red-500"
                                        />
                                    {:else if stepExec.status === "EXECUTING"}
                                        <div
                                            class="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
                                        ></div>
                                    {:else}
                                        <div
                                            class="size-6 rounded-full border-2 {activeStepIndex ===
                                            idx
                                                ? 'border-primary text-primary'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'} flex items-center justify-center text-[10px] font-bold"
                                        >
                                            {idx + 1}
                                        </div>
                                    {/if}

                                    {#if idx < stepsExecution.length - 1}
                                        <div
                                            class="absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-2 bg-slate-100 dark:bg-slate-800 mt-0.5"
                                        ></div>
                                    {/if}
                                </div>
                                <div class="text-left min-w-0">
                                    <div
                                        class="text-sm font-bold truncate {activeStepIndex ===
                                        idx
                                            ? 'text-primary'
                                            : 'text-slate-700 dark:text-slate-300'}"
                                    >
                                        {stepDef?.name ||
                                            endpoint?.name ||
                                            `Step ${idx + 1}`}
                                    </div>
                                    <div
                                        class="text-[10px] text-slate-500 truncate uppercase mt-0.5 font-mono"
                                    >
                                        {endpoint?.method || "GET"}
                                        {endpoint?.uri || "/"}
                                    </div>
                                </div>
                            </button>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Content: Active Step Editor -->
            <div class="lg:col-span-3 space-y-6">
                {#if stepsExecution[activeStepIndex]}
                    {@const stepExec = stepsExecution[activeStepIndex]}
                    {@const endpoint = endpointService.getEndpoint(
                        stepExec.endpointId,
                    )}

                    <div
                        class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                        <!-- Step Header -->
                        <div
                            class="p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4"
                        >
                            <div class="flex flex-col gap-3 flex-1 min-w-0">
                                <!-- Row 1: App & Method & Actions -->
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                        >
                                            {endpoint?.application}
                                        </span>
                                        <span
                                            class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                        >
                                            {endpoint?.method}
                                        </span>
                                        <div
                                            class="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-1"
                                        ></div>
                                        <span
                                            class="text-[10px] font-bold text-primary uppercase tracking-widest"
                                            >Step {activeStepIndex + 1}</span
                                        >
                                    </div>

                                    <button
                                        use:observerAction={(node) => {
                                            const observer =
                                                new IntersectionObserver(
                                                    ([entry]) => {
                                                        isButtonInView =
                                                            entry.isIntersecting;
                                                    },
                                                    { threshold: 0 },
                                                );
                                            observer.observe(node);
                                            return {
                                                destroy() {
                                                    observer.disconnect();
                                                },
                                            };
                                        }}
                                        onclick={() => {
                                            if (
                                                stepExec.status === "EXECUTING"
                                            ) {
                                                handleStop();
                                            } else {
                                                stopRequested = false;
                                                executeStep(
                                                    activeStepIndex,
                                                    false,
                                                    `exec_${Date.now()}`,
                                                );
                                            }
                                        }}
                                        class="flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shrink-0 rounded-lg shadow-sm disabled:opacity-70 disabled:scale-100 {stepExec.status ===
                                        'EXECUTING'
                                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                            : stepExec.status === 'READY'
                                              ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                              : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}"
                                    >
                                        {#if stepExec.status === "EXECUTING"}
                                            <div
                                                class="relative flex items-center justify-center"
                                            >
                                                <Loader2
                                                    size={16}
                                                    class="animate-spin opacity-50 absolute"
                                                />
                                                <X size={12} strokeWidth={3} />
                                            </div>
                                            Stop
                                        {:else if stepExec.status === "READY"}
                                            <Check size={16} />
                                            Ready
                                        {:else}
                                            <Play
                                                size={16}
                                                fill="currentColor"
                                            />
                                            Execute
                                        {/if}
                                    </button>
                                </div>

                                <!-- Row 2: Name -->
                                <h3
                                    class="font-bold text-xl text-slate-900 dark:text-white leading-tight"
                                >
                                    {endpoint?.name}
                                </h3>

                                {#if endpoint?.description}
                                    <p
                                        class="text-sm text-slate-500 dark:text-slate-400"
                                    >
                                        {endpoint.description}
                                    </p>
                                {/if}

                                <!-- URL & Domain Row -->
                                <div class="flex flex-wrap items-center gap-3">
                                    <select
                                        value={selectedDomainPrefixes[
                                            stepExec.stepId
                                        ]}
                                        onchange={(e) => {
                                            const val = e.currentTarget.value;
                                            selectedDomainPrefixes[
                                                stepExec.stepId
                                            ] = val;
                                            updateAllStepDomains(
                                                stepExec.stepId,
                                                val,
                                            );
                                        }}
                                        class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/30"
                                    >
                                        {#each getAvailableDomains(stepExec.endpointId) as dom}
                                            <option value={dom.value}
                                                >{dom.label}</option
                                            >
                                        {/each}
                                    </select>

                                    <div
                                        class="flex items-center gap-1.5 px-2 py-1.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30"
                                    >
                                        <span
                                            class="text-[10px] uppercase font-bold opacity-70"
                                            >Site</span
                                        >
                                        <span class="text-xs font-semibold"
                                            >{endpoint?.scope?.site}</span
                                        >
                                    </div>

                                    <div
                                        class="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-1"
                                    ></div>

                                    <div class="flex items-center gap-1.5">
                                        <span
                                            class="text-slate-500 dark:text-slate-400 text-xs"
                                            >Type</span
                                        >
                                        <span
                                            class="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                        >
                                            {endpoint?.requestType}
                                        </span>
                                    </div>

                                    {#if endpoint?.config?.contentType}
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

                                    <div
                                        class="px-3 py-2 bg-white dark:bg-slate-950/50 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400 break-all w-full flex flex-wrap items-center gap-1 mt-1"
                                    >
                                        {#if selectedDomainPrefixes[stepExec.stepId]}
                                            <span class="text-slate-400"
                                                >{selectedDomainPrefixes[
                                                    stepExec.stepId
                                                ]}</span
                                            >
                                        {/if}
                                        <span
                                            class="text-indigo-500/80 dark:text-indigo-400/80"
                                            >/{endpoint?.scope?.site}</span
                                        >
                                        <span>{endpoint?.uri}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="p-6">
                            <!-- Parameters Section -->
                            <div class="space-y-6">
                                <div
                                    class="flex items-center justify-between px-1"
                                >
                                    <div class="flex items-center gap-2">
                                        <Code size={18} class="text-blue-500" />
                                        <h3
                                            class="text-lg font-bold text-slate-800 dark:text-slate-200"
                                        >
                                            Request Parameters
                                        </h3>
                                    </div>
                                    <button
                                        onclick={() =>
                                            applyMappings(activeStepIndex)}
                                        class="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5"
                                    >
                                        <RotateCcw size={12} />
                                        Refresh from Mappings
                                    </button>
                                </div>

                                <div
                                    class="bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                                >
                                    <ExecutionParameterForm
                                        fields={endpoint?.requestData || []}
                                        bind:values={stepExec.requestValues}
                                        onUserChange={() =>
                                            resetStepExecution(activeStepIndex)}
                                        getOptions={(f: RequestDataField) =>
                                            getOptions(stepExec.endpointId, f)}
                                        bind:activeDropdownPath
                                    />
                                </div>
                            </div>

                            <!-- Results Section -->
                            {#if stepExec.sentRequest || stepExec.result || stepExec.error || stepExec.status === "EXECUTING"}
                                <div
                                    class="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6"
                                    in:slide
                                >
                                    {#if stepExec.status === "EXECUTING" && endpoint?.requestType === "FORM"}
                                        <div
                                            class="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center gap-4 animate-pulse"
                                        >
                                            <div
                                                class="size-2 rounded-full bg-blue-500 animate-bounce"
                                            ></div>
                                            <span
                                                class="text-sm font-bold text-blue-700 dark:text-blue-400"
                                                >Waiting for Popup
                                                interaction...</span
                                            >
                                        </div>
                                    {/if}
                                    <!-- 1. Prepared Data Section (Signature & Request Params) -->
                                    {#if stepExec.signatureSourceString || stepExec.sentRequest}
                                        <div class="space-y-4" in:slide>
                                            <div
                                                class="flex items-center gap-2 px-1"
                                            >
                                                <Zap
                                                    size={18}
                                                    class="text-amber-500"
                                                />
                                                <h3
                                                    class="text-lg font-bold text-slate-800 dark:text-slate-200"
                                                >
                                                    Prepared Data
                                                </h3>
                                            </div>
                                            <div
                                                class="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl"
                                            >
                                                <ExecutionResultView
                                                    signatureRawString={stepExec.signatureSourceString}
                                                    jsonResult={stepExec.sentRequest}
                                                    executionStage="PREPARE"
                                                />
                                            </div>
                                        </div>
                                    {/if}

                                    <!-- 2. Execution Result Section (Response) -->
                                    {#if stepExec.result || stepExec.error}
                                        <div
                                            class="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800"
                                            in:slide
                                        >
                                            <div
                                                class="flex items-center gap-2 px-1"
                                            >
                                                <Eye
                                                    size={18}
                                                    class="text-emerald-500"
                                                />
                                                <h3
                                                    class="text-lg font-bold text-slate-800 dark:text-slate-200"
                                                >
                                                    Execution Result
                                                </h3>
                                            </div>

                                            {#if stepExec.error}
                                                <div
                                                    class="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-4"
                                                >
                                                    <AlertCircle
                                                        class="text-red-500 shrink-0 mt-0.5"
                                                        size={20}
                                                    />
                                                    <div>
                                                        <h4
                                                            class="text-sm font-bold text-red-900 dark:text-red-400 uppercase tracking-widest text-[10px]"
                                                        >
                                                            Error Details
                                                        </h4>
                                                        <p
                                                            class="text-sm text-red-700 dark:text-red-300 mt-1 whitespace-pre-wrap"
                                                        >
                                                            {stepExec.error}
                                                        </p>
                                                    </div>
                                                </div>
                                            {/if}

                                            {#if stepExec.result}
                                                <div
                                                    class="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl"
                                                >
                                                    <div
                                                        class="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between"
                                                    >
                                                        <span
                                                            class="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
                                                            >JSON Response</span
                                                        >
                                                        <span
                                                            class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold"
                                                            >{stepExec.status ===
                                                            "SUCCESS"
                                                                ? "200 OK"
                                                                : "COMPLETED"}</span
                                                        >
                                                    </div>
                                                    <ExecutionResultView
                                                        responseResult={typeof stepExec.result ===
                                                        "string"
                                                            ? stepExec.result
                                                            : JSON.stringify(
                                                                  stepExec.result,
                                                                  null,
                                                                  2,
                                                              )}
                                                        responseStatus={stepExec.status ===
                                                        "SUCCESS"
                                                            ? 200
                                                            : 500}
                                                        executionStage="EXECUTE"
                                                    />
                                                </div>
                                            {/if}

                                            <!-- 3. Response Validation Section -->
                                            {#if stepExec.processedResult}
                                                <div
                                                    class="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800"
                                                    in:slide
                                                >
                                                    <div
                                                        class="flex items-center gap-2 px-1"
                                                    >
                                                        <CheckCircle2
                                                            size={18}
                                                            class="text-indigo-500"
                                                        />
                                                        <h3
                                                            class="text-lg font-bold text-slate-800 dark:text-slate-200"
                                                        >
                                                            Response Validation
                                                        </h3>
                                                    </div>

                                                    <div
                                                        class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm"
                                                    >
                                                        <div
                                                            class="flex items-center gap-2 mb-1"
                                                        >
                                                            <Bookmark
                                                                size={14}
                                                                class="text-slate-400"
                                                            />
                                                            <span
                                                                class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest"
                                                                >Decrypted /
                                                                Decoded Data</span
                                                            >
                                                        </div>

                                                        <div class="grid gap-3">
                                                            {#each Object.entries(stepExec.processedResult) as [key, data]}
                                                                <div
                                                                    class="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 group relative transition-all hover:border-slate-300 dark:hover:border-slate-700"
                                                                >
                                                                    <div
                                                                        class="flex items-center justify-between mb-2"
                                                                    >
                                                                        <span
                                                                            class="text-[11px] font-bold text-slate-700 dark:text-slate-300"
                                                                            >{key}</span
                                                                        >
                                                                        <div
                                                                            class="flex gap-1.5"
                                                                        >
                                                                            {#if data.decoded}
                                                                                <span
                                                                                    class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400"
                                                                                    >URL
                                                                                    DECODED</span
                                                                                >
                                                                            {/if}
                                                                            {#if data.decrypted}
                                                                                <span
                                                                                    class="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400"
                                                                                    >DECRYPTED</span
                                                                                >
                                                                            {/if}
                                                                        </div>
                                                                    </div>
                                                                    <div
                                                                        class="text-sm font-medium text-emerald-600 dark:text-emerald-400 font-mono break-all line-clamp-2 group-hover:line-clamp-none transition-all"
                                                                    >
                                                                        {data.value}
                                                                    </div>
                                                                </div>
                                                            {/each}
                                                        </div>
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {:else}
        <div class="flex items-center justify-center min-h-[60vh]">
            <div class="text-center">
                <div
                    class="size-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4"
                >
                    <History size={32} />
                </div>
                <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
                    Collection not found
                </h2>
                <p class="text-slate-500 mt-2">
                    The collection you are trying to run doesn't exist.
                </p>
                <a
                    href="/collections"
                    class="inline-block mt-6 px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors"
                >
                    Back to Collections
                </a>
            </div>
        </div>
    {/if}

    {#if !isButtonInView && stepsExecution[activeStepIndex]}
        {@const stepExec = stepsExecution[activeStepIndex]}
        <div
            class="fixed bottom-10 right-10 z-50 flex flex-col gap-3 items-center"
            transition:scale={{ duration: 200, start: 0.8 }}
        >
            {#if isFabMenuOpen}
                <div
                    transition:slide={{ axis: "y", duration: 200 }}
                    class="flex flex-col gap-3 items-center mb-1"
                >
                    <button
                        onclick={scrollToTop}
                        class="h-11 w-11 rounded-full shadow-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                        title="Scroll to Top"
                    >
                        <ArrowUp size={20} />
                    </button>
                    <button
                        onclick={() => {
                            showSavePresetDialog = true;
                            isFabMenuOpen = false;
                        }}
                        class="h-11 w-11 rounded-full shadow-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800"
                        title="Save as Preset"
                    >
                        <Save size={20} />
                    </button>
                    <!-- Preset dropdown trigger could be added here or handled via separate UI -->
                    <button
                        onclick={() => {
                            showLoadPresetDialog = true;
                            isFabMenuOpen = false;
                        }}
                        class="h-11 w-11 rounded-full shadow-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800"
                        title="Load Preset"
                    >
                        <FolderOpen size={20} />
                    </button>
                </div>
            {/if}

            <div class="flex items-center gap-3">
                <button
                    onclick={() => (isFabMenuOpen = !isFabMenuOpen)}
                    class="h-12 w-12 rounded-full shadow-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-all active:scale-95"
                    title="Menu"
                >
                    {#if isFabMenuOpen}
                        <X size={24} />
                    {:else}
                        <Menu size={24} />
                    {/if}
                </button>

                <button
                    class="h-16 w-16 rounded-3xl shadow-2xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 {stepExec.status ===
                    'EXECUTING'
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                        : stepExec.status === 'READY'
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'}"
                    onclick={() => {
                        if (stepExec.status === "EXECUTING") {
                            handleStop();
                        } else {
                            stopRequested = false;
                            executeStep(activeStepIndex);
                        }
                    }}
                >
                    {#if stepExec.status === "EXECUTING"}
                        <div class="relative flex items-center justify-center">
                            <Loader2
                                size={28}
                                class="animate-spin opacity-50 absolute"
                            />
                            <X size={20} strokeWidth={3} />
                        </div>
                    {:else if stepExec.status === "READY"}
                        <Check size={28} strokeWidth={3} />
                    {:else}
                        <Play size={28} fill="currentColor" />
                    {/if}
                </button>
            </div>
        </div>
    {/if}
</div>

<!-- Save Preset Dialog -->
<Modal bind:isOpen={showSavePresetDialog} title="Save Execution Preset">
    <div class="space-y-4 pt-2">
        <p class="text-sm text-slate-500 dark:text-slate-400">
            Save current values as a preset to quickly reuse them later in this
            collection.
        </p>
        <div class="space-y-2">
            <label
                for="presetName"
                class="text-sm font-bold text-slate-700 dark:text-slate-300 px-1"
                >Preset Name</label
            >
            <input
                id="presetName"
                type="text"
                bind:value={newPresetName}
                placeholder="e.g. Test with Mock User"
                class="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-slate-900 dark:text-white transition-all shadow-sm"
            />
        </div>
        <div class="flex justify-end gap-3 mt-8">
            <button
                onclick={() => (showSavePresetDialog = false)}
                class="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
                Cancel
            </button>
            <button
                onclick={handleSavePreset}
                disabled={!newPresetName.trim()}
                class="px-8 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20 disabled:opacity-50 transition-all"
            >
                Save Preset
            </button>
        </div>
    </div>
</Modal>

<!-- Load Preset Dialog -->
<Modal bind:isOpen={showLoadPresetDialog} title="Load Execution Preset">
    <div class="space-y-4 pt-2">
        <p class="text-sm text-slate-500 dark:text-slate-400">
            Select a saved preset to load its values.
        </p>

        <div class="max-h-96 overflow-y-auto space-y-1 pr-1">
            {#if collectionPresets.length === 0}
                <div
                    class="p-8 text-center text-sm text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700"
                >
                    No presets saved yet.
                </div>
            {:else}
                {#each collectionPresets as preset}
                    <div
                        class="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                    >
                        <button
                            onclick={() => {
                                loadPreset(preset);
                                showLoadPresetDialog = false;
                            }}
                            class="flex-1 text-left"
                        >
                            <div
                                class="text-sm font-bold text-slate-700 dark:text-slate-300"
                            >
                                {preset.name}
                            </div>
                            <div class="text-xs text-slate-400 mt-0.5">
                                {new Date(preset.createdAt).toLocaleString()}
                            </div>
                        </button>
                        <button
                            onclick={() => deletePreset(preset.id)}
                            class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Preset"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                {/each}
            {/if}
        </div>

        <div
            class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800"
        >
            <button
                onclick={() => (showLoadPresetDialog = false)}
                class="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
                Close
            </button>
        </div>
    </div>
</Modal>

<div bind:this={bottomAnchor} class="h-4 w-full" aria-hidden="true"></div>

<AlertModal
    bind:isOpen={isAlertOpen}
    title={alertTitle}
    message={alertMessage}
    type={alertType}
    onConfirm={onAlertConfirm}
    onCancel={onAlertCancel}
/>

<style>
    :global(.param-dropdown-container) {
        position: relative;
    }
</style>
