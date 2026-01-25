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
        X,
        Save,
        History,
        RotateCcw,
        Bookmark,
        CloudUpload,
        CloudDownload,
        Copy,
        CopyCheck,
        Loader2,
    } from "lucide-svelte";
    import { syncService } from "$lib/services/syncService";
    import { authStore } from "$lib/services/authService";
    import {
        executionService,
        type ExecutionPreset,
    } from "$lib/services/executionService";
    import { settingsStore } from "$lib/stores/settingsStore";
    import {
        generateSignature,
        encryptData,
        decryptData,
        urlDecodeData,
        urlEncodeData,
        type SecurityContext,
    } from "$lib/utils/security";
    import { CheckCircle, XCircle, ShieldCheck, LockOpen } from "lucide-svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import type { Endpoint, RequestDataField } from "$lib/types/endpoint";
    import { fade, slide, scale } from "svelte/transition";

    let {
        isOpen = $bindable(false),
        endpoint = $bindable(null as Endpoint | null),
    } = $props();

    let requestValues = $state<Record<string, any>>({});
    let jsonResult = $state("");
    let responseResult = $state("");
    let responseStatus = $state<number | null>(null);
    let signatureRawString = $state("");
    let activeDropdownPath = $state<string | null>(null);
    let executionStage = $state<"READY" | "EXECUTE">("READY"); // New state
    let isExecuting = $state(false);
    let availableDomains = $state<{ label: string; value: string }[]>([]);
    let selectedDomainPrefix = $state("");
    let securityContext = $state<SecurityContext>({});

    // Preset & History State
    let presets = $state<ExecutionPreset[]>([]);
    let showSavePresetDialog = $state(false);
    let newPresetName = $state("");
    let isPresetDropdownOpen = $state(false); // Added state for preset dropdown

    // Response Validation State
    let responseSignatureRawString = $state("");
    let responseCalculatedSignature = $state("");
    let responseValidationSuccess = $state<boolean | null>(null);
    let responseDecryptedData = $state<
        { name: string; value: string; original: string; type: string }[]
    >([]);
    let copiedSection = $state<string | null>(null);

    // Sync Notification State
    let showSyncAlert = $state(false);
    let syncAlertMessage = $state("");
    let syncAlertTitle = $state("");
    let isBackingUp = $state(false);
    let isRestoring = $state(false);

    let headerRef = $state<HTMLElement | null>(null);
    let isHeaderInView = $state(true);

    $effect(() => {
        if (headerRef && headerRef.parentElement) {
            const body = headerRef.parentElement;
            const handleScroll = () => {
                // Show FAB when scrolled down more than 50px
                isHeaderInView = body.scrollTop < 50;
            };

            body.addEventListener("scroll", handleScroll);
            // Initial check
            handleScroll();

            return () => body.removeEventListener("scroll", handleScroll);
        }
    });

    function handleCopy(text: string, section: string) {
        navigator.clipboard.writeText(text);
        copiedSection = section;
        setTimeout(() => {
            if (copiedSection === section) copiedSection = null;
        }, 2000);
    }

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
                const history = executionService.getHistory(endpoint.id);
                presets = history.presets;

                if (history.lastUsed) {
                    // Merge schema with last used to handle schema updates safely
                    const baseValues = initializeValues(endpoint.requestData);
                    const { domainPrefix: lastDomain, ...lastValues } =
                        history.lastUsed;
                    requestValues = { ...baseValues, ...lastValues };

                    if (lastDomain) {
                        selectedDomainPrefix = lastDomain;
                    }
                } else {
                    requestValues = initializeValues(endpoint.requestData);
                }

                executionStage = "READY"; // Reset stage
                jsonResult = ""; // Reset result
                responseResult = ""; // Reset response
                responseStatus = null;
                signatureRawString = ""; // Reset signature source

                // Populate available domains
                const tempDomains = [];
                // ... (rest of domain logic remains same)

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
        // Always close preset dropdown when clicking outside (propagation stopped inside)
        if (isPresetDropdownOpen) {
            isPresetDropdownOpen = false;
        }
    }

    async function handleBackup() {
        if (!$authStore.accessToken) {
            syncAlertTitle = "Authentication Required";
            syncAlertMessage = "Google Drive connection required.";
            showSyncAlert = true;
            return;
        }
        try {
            isBackingUp = true;
            await syncService.saveToDrive();
            syncAlertTitle = "Backup Successful";
            syncAlertMessage = "Backup completed!";
            showSyncAlert = true;
        } catch (e) {
            syncAlertTitle = "Backup Failed";
            syncAlertMessage = "Error saving to Drive: " + (e as Error).message;
            showSyncAlert = true;
        } finally {
            isBackingUp = false;
        }
    }

    async function handleRestore() {
        if (!$authStore.accessToken) {
            syncAlertTitle = "Authentication Required";
            syncAlertMessage = "Google Drive connection required.";
            showSyncAlert = true;
            return;
        }
        try {
            isRestoring = true;
            await syncService.loadFromDrive($authStore.accessToken);
            syncAlertTitle = "Restore Successful";
            syncAlertMessage =
                "Restore completed! (Re-open modal to see updates)";
            showSyncAlert = true;
        } catch (e) {
            syncAlertTitle = "Restore Failed";
            syncAlertMessage =
                "Error loading from Drive: " + (e as Error).message;
            showSyncAlert = true;
        } finally {
            isRestoring = false;
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
            const midValue = requestValues["mid"];
            securityContext = {};

            if (midValue) {
                const midCtx = midContexts.find((c) => c.mid === midValue);
                if (midCtx) {
                    securityContext = {
                        hashKey: midCtx.hashKey,
                        encKey: midCtx.encKey,
                        encIV: midCtx.encIV,
                    };
                }
            }

            let processedValues = { ...requestValues };

            try {
                // Step A: Encryption (Common first step)
                processedValues = encryptData(
                    processedValues,
                    endpoint.requestData,
                    securityContext,
                );

                const signatureField = endpoint.requestData.find(
                    (f) => f.name === "signature",
                );

                if (endpoint.requestType === "FORM") {
                    // FORM Type PREPARATION
                    // 1. Encrypt (already in processedValues from Step A)

                    // FIX: Ensure returnUrl is absolute
                    if (
                        processedValues["returnUrl"] &&
                        String(processedValues["returnUrl"]).startsWith("/")
                    ) {
                        processedValues["returnUrl"] =
                            window.location.origin +
                            processedValues["returnUrl"];
                        requestValues["returnUrl"] =
                            processedValues["returnUrl"]; // Update UI & Persistence for Execute stage
                    }

                    // 2. Specific URL Encoding for Signature & Display
                    // Only encode fields that are explicitly marked as 'encode' in definition
                    const encodedValues = urlEncodeData(
                        processedValues,
                        endpoint.requestData,
                    );

                    // 3. Generate Signature using ENCODED values
                    if (endpoint.signatureMethod && signatureField) {
                        const { signature, rawString } =
                            await generateSignature(
                                encodedValues, // Use ENCODED data
                                endpoint.requestData,
                                endpoint.signatureMethod,
                                securityContext,
                            );
                        // Add signature to both Maps
                        processedValues[signatureField.name] = signature;
                        encodedValues[signatureField.name] = signature;

                        // IMPORTANT: Update requestValues with the signature so it persists for the EXECUTE stage
                        requestValues[signatureField.name] = signature;
                        signatureRawString = rawString;
                    }

                    // 4. Display Logic (Manual key=value construction to avoid double-encoding)
                    jsonResult = Object.entries(encodedValues)
                        .map(([key, value]) => `${key}=${value}`)
                        .join("\n");

                    executionStage = "EXECUTE";
                    return;
                }

                // NOT FORM TYPE Logic (GET/POST JSON/etc)
                const encodedValues = urlEncodeData(
                    processedValues,
                    endpoint.requestData,
                );

                // Use encoded values for signature if it's POST and we are about to URL encode
                const valuesForSignature =
                    endpoint.method === "POST" &&
                    endpoint.config?.contentType ===
                        "application/x-www-form-urlencoded"
                        ? encodedValues
                        : processedValues;

                if (endpoint.signatureMethod && signatureField) {
                    const { signature, rawString } = await generateSignature(
                        valuesForSignature,
                        endpoint.requestData,
                        endpoint.signatureMethod,
                        securityContext,
                    );
                    processedValues[signatureField.name] = signature;
                    encodedValues[signatureField.name] = signature;
                    requestValues[signatureField.name] = signature;
                    signatureRawString = rawString;
                }

                if (
                    endpoint.config?.contentType ===
                    "application/x-www-form-urlencoded"
                ) {
                    // Manual construction to respect field.encoded
                    jsonResult = Object.entries(encodedValues)
                        .map(([key, value]) => `${key}=${value}`)
                        .join("\n");
                } else {
                    jsonResult = JSON.stringify(processedValues, null, 2);
                }

                // If successful, move to EXECUTE stage
                executionStage = "EXECUTE";
            } catch (e) {
                console.error("Security processing failed:", e);
                responseResult =
                    "Error during preparation: " + (e as Error).message;
            }
        } else {
            // EXECUTE stage logic
            isExecuting = true;
            responseResult = "";
            responseStatus = null;

            // Save to execution history
            if (endpoint) {
                executionService.saveLastUsed(endpoint.id, {
                    ...requestValues,
                    domainPrefix: selectedDomainPrefix,
                });
            }

            if (endpoint.requestType === "FORM") {
                // FORM Execution: Open Popup with RAW Encrypted Values
                try {
                    const popupName = `wpay_popup_${Date.now()}`;
                    const width = 451;
                    const height = 908;
                    const left = (window.screen.width - width) / 2;
                    const top = (window.screen.height - height) / 2;

                    window.open(
                        "",
                        popupName,
                        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`,
                    );

                    const form = document.createElement("form");
                    form.method = endpoint.method || "POST";

                    let fullUrl = `${selectedDomainPrefix}`;
                    if (endpoint.scope.site)
                        fullUrl += `/${endpoint.scope.site}`;
                    fullUrl += endpoint.uri;

                    form.action = fullUrl;
                    form.target = popupName;
                    form.style.display = "none";

                    // Re-calculate encryption because processedValues was local to READY block.
                    // We use requestValues which now contains the User Input + Generated Signature.
                    // WAIT: requestValues has the raw user input + the raw signature.
                    // We need to re-encrypt the user inputs.

                    // 1. Re-Find Context
                    const midValue = requestValues["mid"];
                    let execContext = {};
                    if (midValue) {
                        const midCtx = midContexts.find(
                            (c) => c.mid === midValue,
                        );
                        if (midCtx)
                            execContext = {
                                hashKey: midCtx.hashKey,
                                encKey: midCtx.encKey,
                                encIV: midCtx.encIV,
                            };
                    }

                    // 2. Encrypt (Using requestValues as source)
                    // encryptData will encrypt fields marked as Encrypt.
                    // It will NOT touch fields not marked (like signature usually).
                    let payload = encryptData(
                        requestValues,
                        endpoint.requestData,
                        execContext,
                    );

                    // 3. Ensure Signature is present in payload
                    const signatureField = endpoint.requestData.find(
                        (f) => f.name === "signature",
                    );
                    if (signatureField && requestValues[signatureField.name]) {
                        payload[signatureField.name] =
                            requestValues[signatureField.name];
                    }

                    // 4. PRE-ENCODE (To match signature source and prevent double-encoding mismatch)
                    // This ensures that what is sent in the form matches the 'Request Parameters' display.
                    payload = urlEncodeData(payload, endpoint.requestData);

                    Object.entries(payload).forEach(([key, value]) => {
                        const input = document.createElement("input");
                        input.type = "hidden";
                        input.name = key;
                        input.value = String(value || "");
                        form.appendChild(input);
                    });

                    document.body.appendChild(form);
                    form.submit();
                    document.body.removeChild(form);

                    // Setup BroadcastChannel (Fallback for when window.opener is lost)
                    const bc = new BroadcastChannel("wpay_channel");

                    const handleWpayResult = (resultData: any) => {
                        console.log(
                            "WPAY_RESULT received via " +
                                (bc ? "BroadcastChannel" : "postMessage"),
                        );
                        responseStatus = 200;
                        responseResult = JSON.stringify(resultData, null, 2);

                        // Trigger Validation
                        console.log("Triggering validateResponse...");
                        validateResponse(resultData, execContext);

                        // Cleanup
                        window.removeEventListener("message", messageHandler);
                        if (bc) bc.close();
                    };

                    bc.onmessage = (event) => {
                        if (event.data && event.data.type === "WPAY_RESULT") {
                            console.log(
                                "Received message via BroadcastChannel",
                            );
                            handleWpayResult(event.data.data);
                        }
                    };

                    console.log("Adding WPAY_RESULT message listener...");
                    const messageHandler = (event: MessageEvent) => {
                        // console.log("Message received in modal:", event); // Silenced spam
                        if (event.data && event.data.type === "WPAY_RESULT") {
                            console.log(
                                "Received message via window.postMessage",
                            );
                            handleWpayResult(event.data.data);
                        }
                    };
                    window.addEventListener("message", messageHandler);
                } catch (e) {
                    console.error(e);
                    responseResult =
                        "Error opening popup: " + (e as Error).message;
                } finally {
                    isExecuting = false;
                }
            } else {
                // REST Execution (GET/POST/etc)
                try {
                    // 1. Prepare URL
                    let fullUrl = `${selectedDomainPrefix}`;
                    if (endpoint.scope.site)
                        fullUrl += `/${endpoint.scope.site}`;
                    fullUrl += endpoint.uri;

                    // 2. Re-Encrypt for Execution (same logic as FORM)
                    const midValue = requestValues["mid"];
                    let execContext = {};
                    if (midValue) {
                        const midCtx = midContexts.find(
                            (c) => c.mid === midValue,
                        );
                        if (midCtx)
                            execContext = {
                                hashKey: midCtx.hashKey,
                                encKey: midCtx.encKey,
                                encIV: midCtx.encIV,
                            };
                    }

                    // Encrypt
                    let payload = encryptData(
                        requestValues,
                        endpoint.requestData,
                        execContext,
                    );

                    // Ensure Signature is present
                    const signatureField = endpoint.requestData.find(
                        (f) => f.name === "signature",
                    );
                    if (signatureField && requestValues[signatureField.name]) {
                        payload[signatureField.name] =
                            requestValues[signatureField.name];
                    }

                    // 3. Prepare Fetch Options
                    let body: BodyInit | null = null;
                    const headers: HeadersInit = {};

                    // Add Custom Headers if any
                    if (endpoint.config?.customHeaders) {
                        endpoint.config.customHeaders.forEach((h) => {
                            headers[h.key] = h.value;
                        });
                    }

                    if (endpoint.config?.contentType) {
                        headers["Content-Type"] = endpoint.config.contentType;
                    }

                    if (
                        endpoint.method !== "GET" &&
                        endpoint.method !== "DELETE"
                    ) {
                        // For POST/PUT/PATCH
                        if (
                            endpoint.config?.contentType ===
                            "application/x-www-form-urlencoded"
                        ) {
                            const params = new URLSearchParams();
                            Object.entries(payload).forEach(([key, value]) => {
                                if (value !== undefined && value !== null) {
                                    params.append(key, String(value));
                                }
                            });
                            body = params;
                        } else {
                            // Default JSON
                            body = JSON.stringify(payload);
                            if (!headers["Content-Type"]) {
                                headers["Content-Type"] = "application/json";
                            }
                        }
                    } else {
                        // For GET/DELETE -> Query Params
                        const params = new URLSearchParams();
                        Object.entries(payload).forEach(([key, value]) => {
                            if (value !== undefined && value !== null) {
                                params.append(key, String(value));
                            }
                        });
                        const queryString = params.toString();
                        if (queryString) {
                            fullUrl +=
                                (fullUrl.includes("?") ? "&" : "?") +
                                queryString;
                        }
                    }

                    // 4. Perform Request via Proxy to avoid CORS
                    const proxyBody = {
                        url: fullUrl,
                        method: endpoint.method,
                        headers,
                        body:
                            body instanceof URLSearchParams
                                ? body.toString()
                                : body,
                    };

                    const response = await fetch("/api/proxy", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(proxyBody),
                    });

                    responseStatus = response.status;
                    const text = await response.text();

                    try {
                        const data = JSON.parse(text);
                        responseResult = JSON.stringify(data, null, 2);
                        // Validate
                        validateResponse(data, execContext);
                    } catch (e) {
                        // Not JSON
                        responseResult = text;
                    }
                } catch (e) {
                    console.error("REST execution failed:", e);
                    responseResult =
                        "Error executing request: " + (e as Error).message;
                } finally {
                    isExecuting = false;
                }
            }
        }
    }

    function loadPreset(preset: ExecutionPreset) {
        const baseValues = initializeValues(endpoint?.requestData);
        requestValues = { ...baseValues, ...preset.values };
        if (preset.domainPrefix) {
            selectedDomainPrefix = preset.domainPrefix;
        }
        handleUserChange();
    }

    function handleSavePreset() {
        if (!endpoint || !newPresetName.trim()) return;
        const newPreset = executionService.savePreset(
            endpoint.id,
            newPresetName.trim(),
            requestValues,
            selectedDomainPrefix,
        );
        presets = [...presets, newPreset];
        newPresetName = "";
        showSavePresetDialog = false;
    }

    function handleDeletePreset(id: string) {
        if (!endpoint) return;
        executionService.deletePreset(endpoint.id, id);
        presets = presets.filter((p) => p.id !== id);
    }

    function resetToDefault() {
        requestValues = initializeValues(endpoint?.requestData);
        handleUserChange();
    }

    function handleUserChange() {
        if (executionStage === "EXECUTE") {
            executionStage = "READY";
            jsonResult = ""; // Clear result to avoid confusion
            signatureRawString = ""; // Clear signature source
            responseResult = ""; // Clear previous response
            responseStatus = null; // Clear previous status

            // Clear validation results
            responseSignatureRawString = "";
            responseCalculatedSignature = "";
            responseValidationSuccess = null;
            responseDecryptedData = [];
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

    let isMobile = $state(false);
    $effect(() => {
        isMobile = window.innerWidth < 768;
        const handler = () => {
            isMobile = window.innerWidth < 768;
        };
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    });

    async function validateResponse(
        data: Record<string, any>,
        context: SecurityContext,
    ) {
        if (!endpoint) return;

        // 1. Signature Validation
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

        // 2. Decryption & Decoding
        const decryptedList: typeof responseDecryptedData = [];
        // Helper to check if processing needed
        const needsProcessing = (f: any) =>
            (f.decoded || f.encrypt) && data[f.name];

        const fieldsToProcess = endpoint.responseData.filter(needsProcessing);

        if (fieldsToProcess.length > 0) {
            // URL Decode first
            const decodedMap = urlDecodeData(data, fieldsToProcess);
            // Then Decrypt (pass the potentially decoded values)
            const decryptedMap = decryptData(
                decodedMap,
                fieldsToProcess,
                context,
            );

            fieldsToProcess.forEach((f) => {
                const original = data[f.name];
                const final = decryptedMap[f.name];

                let typeLabel = [];
                if (f.decoded) typeLabel.push("URL Decoded");
                if (f.encrypt) typeLabel.push("Decrypted");

                decryptedList.push({
                    name: f.name,
                    original: String(original),
                    value: String(final),
                    type: typeLabel.join(" + "),
                });
            });
        }
        responseDecryptedData = decryptedList;
    }
</script>

{#snippet executeButton(extraClass = "", showText = true)}
    <button
        onclick={handleExecute}
        disabled={isExecuting}
        class="flex items-center justify-center gap-2 px-3 md:px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shrink-0 rounded-lg shadow-sm disabled:opacity-70 disabled:scale-100 {executionStage ===
        'READY'
            ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'} {extraClass}"
        title={!showText
            ? isExecuting
                ? "Executing..."
                : executionStage === "READY"
                  ? "Ready"
                  : "Execute"
            : ""}
    >
        {#if isExecuting}
            <div
                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
            ></div>
            {#if showText}Executing...{/if}
        {:else if executionStage === "READY"}
            <Check class="w-4 h-4" />
            {#if showText}Ready{/if}
        {:else}
            <Play class="w-4 h-4" fill="currentColor" />
            {#if showText}Execute{/if}
        {/if}
    </button>
{/snippet}

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
        <div
            class="grid grid-cols-[90px_1fr] md:grid-cols-3 border-b border-slate-200 dark:border-border-dark last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        >
            <!-- Name Column -->
            <div
                class="p-2 md:p-4 align-top md:border-r border-slate-100 dark:border-border-dark/50"
            >
                <div
                    class="flex flex-col gap-1"
                    style="padding-left: {level * 0.5}rem;"
                >
                    <div class="flex items-center gap-0.5 flex-wrap">
                        <label
                            for={path}
                            class="font-semibold text-xs text-slate-700 dark:text-slate-200 break-all"
                        >
                            {field.name}
                        </label>
                        {#if field.required}
                            <span class="text-red-500 font-bold">*</span>
                        {/if}
                    </div>
                    <div
                        class="hidden md:block text-xs text-slate-500 dark:text-slate-400 font-mono"
                    >
                        {field.type}
                    </div>
                    {#if field.description}
                        <div
                            class="hidden md:block text-xs text-slate-500 mt-1 leading-relaxed"
                        >
                            {field.description}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Value Column -->
            <div class="p-2 md:p-4 align-top md:col-span-2">
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
                                    <div
                                        class="bg-white dark:bg-slate-950 flex flex-col"
                                    >
                                        {#each field.subFields || [] as subField}
                                            {@render renderField(
                                                subField,
                                                item,
                                                `${path}[${index}].${subField.name}`,
                                                level + 1,
                                            )}
                                        {/each}
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
                                    transition:fade={{
                                        duration: 200,
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
                            class="w-full px-3 py-2 text-sm font-normal rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                        />
                    {/if}
                {/if}
            </div>
        </div>
    {/if}
{/snippet}

{#snippet fab()}
    {#if !isHeaderInView}
        <div
            class="absolute bottom-10 right-10 z-[999] flex flex-col gap-4 items-end"
            transition:scale={{ duration: 200, start: 0.8 }}
        >
            <button
                onclick={handleExecute}
                disabled={isExecuting}
                class="w-16 h-16 flex items-center justify-center rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all hover:scale-110 active:scale-95 disabled:opacity-70 text-white {executionStage ===
                'READY'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/40'
                    : 'bg-green-600 hover:bg-green-700 shadow-green-600/40'}"
                title={executionStage === "READY" ? "Ready" : "Execute"}
            >
                {#if isExecuting}
                    <div
                        class="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    ></div>
                {:else if executionStage === "READY"}
                    <Check class="w-7 h-7 text-white" />
                {:else}
                    <Play class="w-7 h-7 text-white" fill="currentColor" />
                {/if}
            </button>
        </div>
    {/if}
{/snippet}

<svelte:window onclick={handleOutsideClick} />

<Modal
    bind:isOpen
    title={isMobile ? "" : "Execute Endpoint"}
    width="max-w-4xl"
    bodyClass="max-h-[85vh] overflow-y-auto p-0 text-base font-medium"
    overlay={fab}
>
    {#if endpoint}
        {#if isMobile}
            <!-- Mobile Header Replacement -->
            <div
                class="bg-white dark:bg-slate-900 px-5 py-4 flex justify-between items-center text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800"
            >
                <h2 class="text-lg font-bold">Execute Endpoint</h2>
                <button
                    onclick={() => (isOpen = false)}
                    class="text-slate-500 hover:text-slate-700 p-1"
                >
                    <X size={20} />
                </button>
            </div>
        {/if}

        <!-- Body -->
        <!-- Fixed Header Info -->
        <div
            bind:this={headerRef}
            class="p-4 md:p-5 bg-slate-50 dark:bg-card-dark border-b border-slate-200 dark:border-border-dark shadow-sm z-10 flex flex-col md:flex-row md:justify-between md:items-start gap-4"
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

                <!-- Row 2: Name & Actions -->
                <div
                    class="flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <h3
                        class="font-bold text-xl text-slate-900 dark:text-white leading-tight"
                    >
                        {endpoint.name}
                    </h3>

                    <div class="flex items-center gap-2 shrink-0">
                        <!-- Desktop Actions (Backup, Restore, Preset, Execute) -->
                        <div class="hidden md:flex items-center gap-2">
                            <!-- Backup / Restore Buttons -->
                            {#if $authStore.accessToken}
                                <div class="flex items-center gap-1">
                                    <button
                                        onclick={handleBackup}
                                        disabled={isBackingUp || isRestoring}
                                        class="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Backup to Google Drive"
                                    >
                                        {#if isBackingUp}
                                            <Loader2
                                                size={16}
                                                class="animate-spin"
                                            />
                                        {:else}
                                            <CloudUpload size={16} />
                                        {/if}
                                        <span class="hidden lg:inline"
                                            >Backup</span
                                        >
                                    </button>
                                    <button
                                        onclick={handleRestore}
                                        disabled={isBackingUp || isRestoring}
                                        class="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Restore from Google Drive"
                                    >
                                        {#if isRestoring}
                                            <Loader2
                                                size={16}
                                                class="animate-spin"
                                            />
                                        {:else}
                                            <CloudDownload size={16} />
                                        {/if}
                                        <span class="hidden lg:inline"
                                            >Restore</span
                                        >
                                    </button>
                                </div>
                            {/if}

                            <!-- PRESET DROPDOWN -->
                            <div class="relative">
                                <button
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        isPresetDropdownOpen =
                                            !isPresetDropdownOpen;
                                    }}
                                    class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors {isPresetDropdownOpen
                                        ? 'bg-slate-50 dark:bg-slate-700'
                                        : ''}"
                                >
                                    <Bookmark size={16} />
                                    <span>Preset</span>
                                    <ChevronDown size={14} />
                                </button>

                                <!-- Dropdown Menu -->
                                {#if isPresetDropdownOpen}
                                    <div
                                        transition:fade={{
                                            duration: 150,
                                        }}
                                        class="absolute right-0 top-full mt-1 w-60 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-[60] overflow-hidden"
                                        onclick={(e) => e.stopPropagation()}
                                    >
                                        <div
                                            class="max-h-[300px] overflow-y-auto p-1"
                                        >
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
                                                                loadPreset(
                                                                    preset,
                                                                );
                                                                isPresetDropdownOpen = false;
                                                            }}
                                                            class="flex-1 text-left text-sm text-slate-700 dark:text-slate-200 truncate pr-2"
                                                        >
                                                            {preset.name}
                                                        </button>
                                                        <button
                                                            onclick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePreset(
                                                                    preset.id,
                                                                );
                                                            }}
                                                            class="text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity p-1"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                {/each}
                                                <div
                                                    class="h-px bg-slate-100 dark:bg-slate-800 my-1"
                                                ></div>
                                            {/if}

                                            <button
                                                onclick={() => {
                                                    showSavePresetDialog = true;
                                                    isPresetDropdownOpen = false;
                                                }}
                                                class="w-full flex items-center gap-2 px-2 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                            >
                                                <Save size={14} />
                                                <span>Save Current Values</span>
                                            </button>

                                            <button
                                                onclick={() => {
                                                    resetToDefault();
                                                    isPresetDropdownOpen = false;
                                                }}
                                                class="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                                            >
                                                <RotateCcw size={14} />
                                                <span>Reset to Defaults</span>
                                            </button>
                                        </div>
                                    </div>
                                {/if}
                            </div>

                            {@render executeButton()}
                        </div>

                        <!-- Mobile Action Buttons -->
                        <div class="md:hidden mt-0 flex items-center gap-2">
                            <!-- Backup / Restore (Mobile) -->
                            {#if $authStore.accessToken}
                                <button
                                    onclick={handleBackup}
                                    disabled={isBackingUp || isRestoring}
                                    class="flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50"
                                    title="Backup"
                                >
                                    {#if isBackingUp}
                                        <Loader2
                                            size={20}
                                            class="animate-spin"
                                        />
                                    {:else}
                                        <CloudUpload size={20} />
                                    {/if}
                                </button>
                                <button
                                    onclick={handleRestore}
                                    disabled={isBackingUp || isRestoring}
                                    class="flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50"
                                    title="Restore"
                                >
                                    {#if isRestoring}
                                        <Loader2
                                            size={20}
                                            class="animate-spin"
                                        />
                                    {:else}
                                        <CloudDownload size={20} />
                                    {/if}
                                </button>
                            {/if}

                            <!-- Preset Dropdown (Mobile) -->
                            <div class="relative">
                                <button
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        isPresetDropdownOpen =
                                            !isPresetDropdownOpen;
                                    }}
                                    class="flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg {isPresetDropdownOpen
                                        ? 'bg-slate-50 dark:bg-slate-700'
                                        : ''}"
                                    title="Presets"
                                >
                                    <Bookmark size={20} />
                                </button>

                                {#if isPresetDropdownOpen}
                                    <div
                                        transition:fade={{
                                            duration: 150,
                                        }}
                                        class="absolute left-0 top-full mt-1 w-60 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-[70] overflow-hidden"
                                        onclick={(e) => e.stopPropagation()}
                                    >
                                        <div
                                            class="max-h-[300px] overflow-y-auto p-1"
                                        >
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
                                                                loadPreset(
                                                                    preset,
                                                                );
                                                                isPresetDropdownOpen = false;
                                                            }}
                                                            class="flex-1 text-left text-sm text-slate-700 dark:text-slate-200 truncate pr-2"
                                                        >
                                                            {preset.name}
                                                        </button>
                                                        <button
                                                            onclick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeletePreset(
                                                                    preset.id,
                                                                );
                                                            }}
                                                            class="text-slate-400 hover:text-red-500 p-1"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                {/each}
                                                <div
                                                    class="h-px bg-slate-100 dark:bg-slate-800 my-1"
                                                ></div>
                                            {/if}
                                            <button
                                                onclick={() => {
                                                    showSavePresetDialog = true;
                                                    isPresetDropdownOpen = false;
                                                }}
                                                class="w-full flex items-center gap-2 px-2 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                            >
                                                <Save size={14} />
                                                <span>Save Current Values</span>
                                            </button>
                                            <button
                                                onclick={() => {
                                                    resetToDefault();
                                                    isPresetDropdownOpen = false;
                                                }}
                                                class="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                                            >
                                                <RotateCcw size={14} />
                                                <span>Reset to Defaults</span>
                                            </button>
                                        </div>
                                    </div>
                                {/if}
                            </div>

                            {@render executeButton("flex-1", false)}
                        </div>
                    </div>
                </div>

                {#if endpoint.description}
                    <p
                        class="hidden md:block text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed"
                    >
                        {endpoint.description}
                    </p>
                {/if}

                <!-- Row 3: Configuration & Specs -->
                <div class="mt-2 flex items-center gap-2 flex-wrap">
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
                        <span class="text-[10px] uppercase font-bold opacity-70"
                            >Site</span
                        >
                        <span class="text-xs font-semibold"
                            >{endpoint.scope.site}</span
                        >
                    </div>

                    <div
                        class="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-1"
                    ></div>

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
                        <div class="flex items-center gap-1.5 ml-2">
                            <span
                                class="text-slate-500 dark:text-slate-400 text-xs text-nowrap"
                                >Content-Type</span
                            >
                            <span
                                class="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-nowrap"
                            >
                                {endpoint.config.contentType}
                            </span>
                        </div>
                    {/if}

                    {#if endpoint.config.charset}
                        <div class="flex items-center gap-1.5 ml-1">
                            <span
                                class="text-slate-500 dark:text-slate-400 text-xs"
                                >Charset</span
                            >
                            <span
                                class="px-1.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            >
                                {endpoint.config.charset}
                            </span>
                        </div>
                    {/if}
                </div>
                <div
                    class="px-3 py-2 bg-white dark:bg-slate-950/50 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400 break-all w-full flex flex-wrap items-center gap-1"
                >
                    {#if selectedDomainPrefix}
                        <span class="text-slate-400 select-none"
                            >{selectedDomainPrefix}</span
                        >
                    {/if}
                    <span
                        class="text-indigo-500/80 dark:text-indigo-400/80 select-none"
                        >/{endpoint.scope.site}</span
                    >
                    <span>{endpoint.uri}</span>
                </div>
            </div>
        </div>

        <!-- SAVE PRESET DIALOG OVERLAY -->
        {#if showSavePresetDialog}
            <div
                class="absolute inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/50 backdrop-blur-sm p-4"
                transition:fade={{ duration: 150 }}
            >
                <div
                    class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-sm"
                    transition:fade={{ duration: 200 }}
                >
                    <h3
                        class="text-lg font-bold text-slate-900 dark:text-white mb-4"
                    >
                        Save Preset
                    </h3>
                    <input
                        type="text"
                        bind:value={newPresetName}
                        placeholder="Enter preset name..."
                        class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white mb-4 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                    <div class="flex justify-end gap-2">
                        <button
                            onclick={() => {
                                showSavePresetDialog = false;
                                newPresetName = "";
                            }}
                            class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onclick={handleSavePreset}
                            disabled={!newPresetName.trim()}
                            class="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Body contents -->
        <div class="p-0 md:p-6 flex flex-col gap-6 bg-white dark:bg-slate-900">
            <!-- Data Input Form -->
            <div class="flex flex-col gap-4">
                {#if endpoint.requestData && endpoint.requestData.length > 0}
                    <div
                        class="md:rounded-lg md:border border-slate-200 dark:border-border-dark overflow-hidden flex flex-col bg-white dark:bg-slate-950/50"
                    >
                        <!-- Data Fields -->
                        <div class="flex flex-col">
                            {#each endpoint.requestData as field}
                                {@render renderField(
                                    field,
                                    requestValues,
                                    field.name,
                                )}
                            {/each}
                        </div>
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
                        class="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-border-dark font-medium text-sm text-slate-700 dark:text-slate-300 flex justify-between items-center"
                    >
                        <span>Signature Source String</span>
                        <button
                            onclick={() =>
                                handleCopy(signatureRawString, "signature")}
                            class="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"
                            title="Copy to clipboard"
                        >
                            {#if copiedSection === "signature"}
                                <CopyCheck size={14} class="text-green-500" />
                            {:else}
                                <Copy size={14} />
                            {/if}
                        </button>
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
                        class="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-border-dark font-medium text-sm text-slate-700 dark:text-slate-300 flex justify-between items-center"
                    >
                        <span>Request Parameters</span>
                        <button
                            onclick={() => handleCopy(jsonResult, "params")}
                            class="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"
                            title="Copy to clipboard"
                        >
                            {#if copiedSection === "params"}
                                <CopyCheck size={14} class="text-green-500" />
                            {:else}
                                <Copy size={14} />
                            {/if}
                        </button>
                    </div>
                    <pre
                        class="p-4 bg-slate-900 text-slate-50 overflow-x-auto text-sm font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">{jsonResult}</pre>
                </div>
            {/if}

            <!-- Response Result -->
            {#if responseResult}
                <div
                    class="rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden shrink-0"
                    transition:fade
                >
                    <div
                        class="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-border-dark font-medium text-sm flex justify-between items-center"
                    >
                        <div class="flex items-center gap-2">
                            <span class="text-slate-700 dark:text-slate-300"
                                >Response</span
                            >
                            {#if responseStatus}
                                <span
                                    class="px-2 py-0.5 rounded text-[10px] font-bold {responseStatus >=
                                        200 && responseStatus < 300
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}"
                                >
                                    STATUS: {responseStatus}
                                </span>
                            {/if}
                        </div>
                        <button
                            onclick={() =>
                                handleCopy(responseResult, "response")}
                            class="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"
                            title="Copy to clipboard"
                        >
                            {#if copiedSection === "response"}
                                <CopyCheck size={14} class="text-green-500" />
                            {:else}
                                <Copy size={14} />
                            {/if}
                        </button>
                    </div>
                    <pre
                        class="p-4 bg-slate-950 text-emerald-400 overflow-x-auto text-sm font-mono scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent min-h-[100px]">{responseResult}</pre>
                </div>
            {/if}

            <!-- Response Validation Section -->
            {#if executionStage === "EXECUTE" && (responseValidationSuccess !== null || responseDecryptedData.length > 0)}
                <div
                    class="mt-4 border-t border-slate-200 dark:border-border-dark pt-4 mb-10"
                >
                    <h4
                        class="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2"
                    >
                        <ShieldCheck size={16} class="text-blue-500" />
                        Response Validation
                    </h4>

                    {#if responseValidationSuccess !== null}
                        <div
                            class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800 mb-4"
                        >
                            <div class="flex items-center justify-between mb-3">
                                <span
                                    class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    Signature Verification
                                </span>
                                <span
                                    class={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${
                                        responseValidationSuccess
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    }`}
                                >
                                    {#if responseValidationSuccess}
                                        <CheckCircle size={12} /> Valid
                                    {:else}
                                        <XCircle size={12} /> Invalid
                                    {/if}
                                </span>
                            </div>

                            <div class="space-y-3">
                                <div>
                                    <div class="text-xs text-slate-500 mb-1">
                                        Source String
                                    </div>
                                    <div
                                        class="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono break-all text-slate-600 dark:text-slate-400"
                                    >
                                        {responseSignatureRawString}
                                    </div>
                                </div>
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-3"
                                >
                                    <div>
                                        <div
                                            class="text-xs text-slate-500 mb-1"
                                        >
                                            Generated Signature
                                        </div>
                                        <div
                                            class="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono break-all text-slate-600 dark:text-slate-400"
                                        >
                                            {responseCalculatedSignature}
                                        </div>
                                    </div>
                                    <!-- We could show received signature too, but validation result implies match/mismatch -->
                                </div>
                            </div>
                        </div>
                    {/if}

                    {#if responseDecryptedData.length > 0}
                        <div
                            class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800"
                        >
                            <div class="flex items-center gap-2 mb-3">
                                <LockOpen size={14} class="text-slate-500" />
                                <span
                                    class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                                >
                                    Decrypted / Decoded Data
                                </span>
                            </div>
                            <div class="space-y-2">
                                {#each responseDecryptedData as item}
                                    <div
                                        class="bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 p-3"
                                    >
                                        <div
                                            class="flex justify-between items-start mb-1"
                                        >
                                            <span
                                                class="text-xs font-bold text-slate-700 dark:text-slate-300"
                                            >
                                                {item.name}
                                            </span>
                                            <span
                                                class="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                                            >
                                                {item.type}
                                            </span>
                                        </div>
                                        <div class="grid grid-cols-1 gap-1">
                                            <div
                                                class="text-xs text-emerald-600 dark:text-emerald-400 font-mono break-all"
                                            >
                                                {item.value}
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</Modal>

<AlertModal
    bind:isOpen={showSyncAlert}
    title={syncAlertTitle}
    message={syncAlertMessage}
/>
