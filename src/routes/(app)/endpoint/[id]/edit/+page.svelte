<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import {
        SERVICE_OPTIONS,
        SERVICE_SITE_MAPPING,
        type ServiceType,
        type SiteType,
    } from "$lib/constants/wpayServerType";
    import {
        APPLICATION_OPTIONS,
        type ApplicationType,
    } from "$lib/constants/application";
    import type {
        Endpoint,
        HttpMethod,
        RequestDataField,
        ResponseDataField,
        RequestType,
    } from "$lib/types/endpoint";
    import { endpointService } from "$lib/services/endpointService";
    import RequestDataJsonModal from "$lib/components/endpoint/RequestDataJsonModal.svelte";
    import ResponseDataJsonModal from "$lib/components/endpoint/ResponseDataJsonModal.svelte";
    import TypeSelector from "$lib/components/endpoint/TypeSelector.svelte";
    import DataDefinitionTable from "$lib/components/endpoint/DataDefinitionTable.svelte";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import { profileStore } from "$lib/stores/profileStore";
    import DropdownInput from "$lib/components/ui/DropdownInput.svelte";

    let endpointId = $state("");
    let selectedApplication = $state<ApplicationType>("WPAY");

    // Dynamic Application Options from Profile
    let applicationOptions = $derived.by(() => {
        const apps =
            $profileStore.myApplications?.map(
                (app) => app.appName as ApplicationType,
            ) || [];
        // Ensure we always have valid ApplicationTypes.
        // Filter against defined APPLICATION_OPTIONS to be safe, or cast if we trust profile.
        // For now, let's filter to only show valid ones to avoid type issues,
        // OR trust the profile and fallback to standard options if empty.
        const validApps = apps.filter((app) =>
            APPLICATION_OPTIONS.includes(app),
        );

        // If user has no apps configured, fallback to default static options
        if (validApps.length === 0) return [...APPLICATION_OPTIONS];

        return Array.from(new Set(validApps));
    });

    let name = $state("");
    let description = $state("");
    let method = $state<HttpMethod>("POST");
    let uri = $state("");
    let requestType = $state<RequestType>("REST");
    let selectedService = $state<ServiceType>(SERVICE_OPTIONS[0]);
    let selectedSite = $state<string>("");
    let signatureMethod = $state<string>(""); // Added state

    let prevRequestType = $state<RequestType>("REST");

    let requestData = $state<RequestDataField[]>([]);
    let responseData = $state<ResponseDataField[]>([]);
    let isJsonModalOpen = $state(false);
    let isResponseJsonModalOpen = $state(false);

    let contentType = $state("application/json");
    let charset = $state("UTF-8");
    let createdAt = $state(0);

    let customHeaders = $state<{ key: string; value: string }[]>([
        { key: "", value: "" },
    ]);

    function addHeader() {
        customHeaders = [...customHeaders, { key: "", value: "" }];
    }

    function removeHeader(index: number) {
        customHeaders = customHeaders.filter((_, i) => i !== index);
    }

    let isBasicOpen = $state(true);
    let isRequestOpen = $state(true);
    let isConfigOpen = $state(true);
    let isResponseOpen = $state(true);

    // Derived site options based on selected service
    let siteOptions = $derived(SERVICE_SITE_MAPPING[selectedService] || []);

    onMount(() => {
        endpointId = $page.params.id ?? "";
        if (!endpointId) {
            alert("Invalid Endpoint ID");
            goto("/endpoint");
            return;
        }
        const endpoint = endpointService.getEndpoint(endpointId);

        if (endpoint) {
            selectedApplication =
                (endpoint.application as ApplicationType) || "WPAY";
            name = endpoint.name;
            description = endpoint.description || "";
            method = endpoint.method;
            uri = endpoint.uri;
            requestType = endpoint.requestType;
            prevRequestType = endpoint.requestType;
            selectedService =
                (endpoint.scope?.service as ServiceType) || SERVICE_OPTIONS[0];
            selectedSite = endpoint.scope?.site || "";
            signatureMethod = endpoint.signatureMethod || ""; // Load from endpoint
            contentType = endpoint.config?.contentType || "application/json";
            charset = endpoint.config?.charset || "UTF-8";
            customHeaders = endpoint.config?.customHeaders || [
                { key: "", value: "" },
            ];
            requestData = endpoint.requestData || [];
            responseData = endpoint.responseData || [];
            createdAt = endpoint.createdAt;
        } else {
            alert("Endpoint not found");
            goto("/endpoint");
        }
    });

    // Set default values ONLY when user interacts (not on initial load)
    // We need to be careful not to overwrite loaded data with defaults
    $effect(() => {
        // Only update site if service changes AND the current site is not valid for the new service
        // But we need to distinguish between initial load and user change.
        // For simplicity, we trust the loaded data is consistent.
        // If user changes service, we default site.
        if (
            siteOptions.length > 0 &&
            !siteOptions.includes(selectedSite as any)
        ) {
            // If currently selected site is NOT in the new options, reset it.
            // This might happen on initial load if data is inconsistent, or on user input.
            // However, on mount, we set selectedService then selectedSite.
            // If we change selectedService via UI, selectedSite might become invalid.
            selectedSite = siteOptions[0];
        } else if (siteOptions.length === 0) {
            selectedSite = "";
        }
    });

    // Removed: let prevRequestType = $state(requestType);

    // Similar logic for Content-Type, we don't want to overwrite if user has custom setting loaded
    $effect(() => {
        // Only apply default if we are sure it's a user change or we want to enforce it.
        if (requestType !== prevRequestType) {
            if (requestType === "REST") {
                contentType = "application/json";
            } else if (requestType === "FORM") {
                contentType = "application/x-www-form-urlencoded";
            }
            prevRequestType = requestType;
        }
    });

    function handleSave() {
        const updatedEndpoint: Endpoint = {
            id: endpointId,
            application: selectedApplication,
            name,
            description,
            method,
            uri,
            requestType,
            scope: {
                service: selectedService,
                site: selectedSite,
            },
            config: {
                contentType,
                customHeaders: customHeaders.filter((h) => h.key && h.value),
            },
            signatureMethod, // Add to save payload
            requestData,
            responseData,
            createdAt: createdAt,
            updatedAt: Date.now(),
        };

        endpointService.updateEndpoint(updatedEndpoint);
        console.log("Updated Endpoint:", updatedEndpoint);

        alert("Endpoint Updated!");
        goto(`/endpoint/${endpointId}`);
    }

    function handleCancel() {
        goto(`/endpoint/${endpointId}`);
    }
</script>

<div class="w-full max-w-screen-2xl mx-auto py-8 px-4">
    <Breadcrumbs
        items={[
            { label: "Home", href: "/" },
            { label: "Test Endpoint", href: "/endpoint" },
            { label: name || "Endpoint", href: `/endpoint/${endpointId}` },
            { label: "Edit" },
        ]}
    />
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Edit Endpoint
        </h1>
        <p class="text-slate-500 dark:text-slate-400">
            Modify API endpoint configuration.
        </p>
    </div>

    <div
        class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark shadow-sm overflow-hidden"
    >
        <div class="p-6 md:p-8 flex flex-col gap-8">
            <!-- Basic Information -->
            <section class="flex flex-col gap-4">
                <button
                    class="flex items-center justify-between w-full text-left group border-b border-slate-100 dark:border-border-dark/50 pb-2"
                    onclick={() => (isBasicOpen = !isBasicOpen)}
                >
                    <h2
                        class="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                        Basic Information
                    </h2>
                    <span
                        class="material-symbols-outlined text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 {isBasicOpen
                            ? 'rotate-180'
                            : ''}"
                    >
                        expand_more
                    </span>
                </button>

                {#if isBasicOpen}
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <div class="flex flex-col gap-2">
                            <label
                                class="text-sm font-medium text-slate-700 dark:text-slate-300"
                                for="application"
                            >
                                Application <span class="text-red-500">*</span>
                            </label>
                            <DropdownInput
                                bind:value={selectedApplication}
                                options={applicationOptions}
                                placeholder="Select Application"
                            />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label
                                class="text-sm font-medium text-slate-700 dark:text-slate-300"
                                for="name"
                            >
                                Endpoint Name <span class="text-red-500">*</span
                                >
                            </label>
                            <input
                                id="name"
                                type="text"
                                bind:value={name}
                                placeholder="e.g. Member Registration"
                                class="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                            />
                        </div>

                        {#if selectedApplication === "WPAY"}
                            <div class="flex flex-col gap-2">
                                <label
                                    class="text-sm font-medium text-slate-700 dark:text-slate-300"
                                    for="scope"
                                >
                                    Scope (Service / Site)
                                </label>
                                <div class="flex gap-2">
                                    <div class="flex-1">
                                        <DropdownInput
                                            bind:value={selectedService}
                                            options={[...SERVICE_OPTIONS]}
                                            placeholder="Service"
                                        />
                                    </div>
                                    <div class="flex-1">
                                        <DropdownInput
                                            bind:value={selectedSite}
                                            options={siteOptions}
                                            placeholder="Site"
                                            disabled={siteOptions.length === 0}
                                        />
                                    </div>
                                </div>
                            </div>
                        {/if}
                        <div
                            class="col-span-1 md:col-span-2 flex flex-col gap-2"
                        >
                            <label
                                class="text-sm font-medium text-slate-700 dark:text-slate-300"
                                for="description"
                            >
                                Description
                            </label>
                            <textarea
                                id="description"
                                bind:value={description}
                                rows="2"
                                placeholder="Briefly describe what this endpoint does..."
                                class="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none resize-none"
                            ></textarea>
                        </div>
                    </div>
                {/if}
            </section>

            <!-- Request Details -->
            <section class="flex flex-col gap-4">
                <button
                    class="flex items-center justify-between w-full text-left group border-b border-slate-100 dark:border-border-dark/50 pb-2"
                    onclick={() => (isRequestOpen = !isRequestOpen)}
                >
                    <h2
                        class="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                        Request Details
                    </h2>
                    <span
                        class="material-symbols-outlined text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 {isRequestOpen
                            ? 'rotate-180'
                            : ''}"
                    >
                        expand_more
                    </span>
                </button>

                {#if isRequestOpen}
                    <div
                        class="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <div class="flex flex-col gap-2">
                            <label
                                class="text-sm font-medium text-slate-700 dark:text-slate-300"
                                for="method"
                            >
                                Method & URI
                            </label>
                            <div class="flex gap-0">
                                <select
                                    bind:value={method}
                                    class="w-32 px-4 py-2.5 rounded-l-lg border border-slate-200 dark:border-border-dark bg-slate-100 dark:bg-background-dark text-slate-900 dark:text-white font-bold focus:z-10 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none cursor-pointer text-center"
                                >
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="PATCH">PATCH</option>
                                    <option value="PUT">PUT</option>
                                    <option value="DELETE">DELETE</option>
                                </select>
                                <input
                                    type="text"
                                    bind:value={uri}
                                    placeholder="/v1/api/..."
                                    class="flex-1 px-4 py-2.5 rounded-r-lg border-y border-r border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div class="flex flex-col gap-6">
                            <div class="flex flex-col gap-2">
                                <span
                                    class="text-sm font-medium text-slate-700 dark:text-slate-300"
                                >
                                    Request Type
                                </span>
                                <div
                                    class="inline-flex bg-slate-100 dark:bg-background-dark p-1 rounded-lg w-fit"
                                >
                                    {#each ["REST", "FORM"] as type}
                                        <button
                                            class="px-6 py-1.5 rounded-md text-sm font-medium transition-all {requestType ===
                                            type
                                                ? 'bg-white dark:bg-border-dark text-primary shadow-sm'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}"
                                            onclick={() =>
                                                (requestType =
                                                    type as RequestType)}
                                        >
                                            {type}
                                        </button>
                                    {/each}
                                </div>
                            </div>

                            {#if requestType === "REST"}
                                <div
                                    class="flex flex-col gap-4 p-5 bg-slate-50 dark:bg-background-dark/50 rounded-xl border border-slate-200 dark:border-border-dark"
                                >
                                    <h3
                                        class="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2"
                                    >
                                        <span
                                            class="material-symbols-outlined text-[18px]"
                                            >settings_ethernet</span
                                        >
                                        Header Options
                                    </h3>

                                    <div class="flex flex-col gap-2">
                                        <span
                                            class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            >Content-Type & Charset</span
                                        >
                                        <div class="flex gap-2">
                                            <div class="flex-1">
                                                <DropdownInput
                                                    bind:value={contentType}
                                                    options={[
                                                        "application/json",
                                                        "application/x-www-form-urlencoded",
                                                        "multipart/form-data",
                                                        "text/plain",
                                                    ]}
                                                    placeholder="Content-Type"
                                                />
                                            </div>
                                            <div class="w-40">
                                                <DropdownInput
                                                    bind:value={charset}
                                                    options={[
                                                        "UTF-8",
                                                        "EUC-KR",
                                                        "ISO-8859-1",
                                                    ]}
                                                    placeholder="Charset"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex flex-col gap-3 pt-2">
                                        <span
                                            class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            >Custom Headers</span
                                        >
                                        {#each customHeaders as header, i}
                                            <div
                                                class="flex gap-2 items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Key"
                                                    bind:value={header.key}
                                                    class="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Value"
                                                    bind:value={header.value}
                                                    class="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                                />
                                                <button
                                                    onclick={() =>
                                                        removeHeader(i)}
                                                    class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Remove Header"
                                                >
                                                    <span
                                                        class="material-symbols-outlined text-[20px]"
                                                        >delete</span
                                                    >
                                                </button>
                                            </div>
                                        {/each}
                                        <button
                                            onclick={addHeader}
                                            class="self-start px-3 py-1.5 text-xs font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <span
                                                class="material-symbols-outlined text-[16px]"
                                                >add</span
                                            > Add Custom Header
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </section>

            <!-- Data Integrity Verification Method -->
            <section class="flex flex-col gap-2">
                <h2
                    class="text-lg font-semibold text-slate-900 dark:text-white"
                >
                    Data Integrity Verification Method
                </h2>
                <div class="flex flex-col gap-2">
                    <select
                        bind:value={signatureMethod}
                        class="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-background-dark/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none cursor-pointer"
                    >
                        <option value="">선택</option>
                        <option value="HMAC_SHA256_KV"
                            >toHexString( SHA256(
                            key=value&...&key=value&hash=&#123;hash key&#125; )
                            )</option
                        >
                        <option value="HMAC_SHA256_V"
                            >toHexString( SHA256( value&...&value&amp;&#123;hash
                            key&#125; ) )</option
                        >
                    </select>
                </div>
            </section>

            <!-- Request Data Definition -->
            <section class="flex flex-col gap-4">
                <button
                    class="flex items-center justify-between w-full text-left group border-b border-slate-100 dark:border-border-dark/50 pb-2"
                    onclick={() => (isConfigOpen = !isConfigOpen)}
                >
                    <h2
                        class="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                        Request Data Definition
                    </h2>
                    <span
                        class="material-symbols-outlined text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 {isConfigOpen
                            ? 'rotate-180'
                            : ''}"
                    >
                        expand_more
                    </span>
                </button>

                {#if isConfigOpen}
                    <div
                        class="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <DataDefinitionTable
                            bind:data={requestData}
                            dataType="Request"
                        >
                            {#snippet extraActions()}
                                <button
                                    onclick={() => (isJsonModalOpen = true)}
                                    class="px-3 py-1.5 text-xs font-bold text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <span
                                        class="material-symbols-outlined text-[16px]"
                                        >data_object</span
                                    > JSON
                                </button>
                            {/snippet}
                        </DataDefinitionTable>
                    </div>
                {/if}
            </section>

            <RequestDataJsonModal
                bind:isOpen={isJsonModalOpen}
                bind:requestData
            />

            <!-- Response Data Definition -->
            <section class="flex flex-col gap-4">
                <button
                    class="flex items-center justify-between w-full text-left group border-b border-slate-100 dark:border-border-dark/50 pb-2"
                    onclick={() => (isResponseOpen = !isResponseOpen)}
                >
                    <h2
                        class="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                        Response Data Definition
                    </h2>
                    <span
                        class="material-symbols-outlined text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 {isResponseOpen
                            ? 'rotate-180'
                            : ''}"
                    >
                        expand_more
                    </span>
                </button>

                {#if isResponseOpen}
                    <div
                        class="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <DataDefinitionTable
                            bind:data={responseData}
                            dataType="Response"
                        >
                            {#snippet extraActions()}
                                <button
                                    onclick={() =>
                                        (isResponseJsonModalOpen = true)}
                                    class="px-3 py-1.5 text-xs font-bold text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <span
                                        class="material-symbols-outlined text-[16px]"
                                        >data_object</span
                                    > JSON
                                </button>
                            {/snippet}
                        </DataDefinitionTable>
                    </div>
                {/if}
            </section>

            <ResponseDataJsonModal
                bind:isOpen={isResponseJsonModalOpen}
                bind:responseData
            />

            <!-- Actions -->
            <div
                class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-border-dark/50"
            >
                <button
                    onclick={handleCancel}
                    class="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-border-dark transition-colors"
                >
                    Cancel
                </button>
                <button
                    onclick={handleSave}
                    disabled={!name || !uri}
                    class="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                    Update Endpoint
                </button>
            </div>
        </div>
    </div>
</div>
