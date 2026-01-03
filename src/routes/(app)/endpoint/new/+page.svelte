<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import {
        SERVICE_OPTIONS,
        SERVICE_SITE_MAPPING,
        type ServiceType,
        type SiteType,
    } from "$lib/constants/wpayServerType";
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
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import DropdownInput from "$lib/components/ui/DropdownInput.svelte";

    let name = $state("");
    let description = $state("");
    let method = $state<HttpMethod>("POST");
    let uri = $state("");
    let requestType = $state<RequestType>("REST");
    let selectedService = $state<ServiceType>(SERVICE_OPTIONS[0]);
    let selectedSite = $state<string>("");

    let requestData = $state<RequestDataField[]>([]);
    let responseData = $state<ResponseDataField[]>([]);
    let isJsonModalOpen = $state(false);
    let isResponseJsonModalOpen = $state(false);

    function addRequestDataField() {
        requestData = [
            ...requestData,
            {
                name: "",
                type: "string",
                required: false,
                encrypt: false,
                encoded: false,
                description: "",
            },
        ];
    }

    function removeRequestDataField(index: number) {
        requestData = requestData.filter((_, i) => i !== index);
    }

    function addResponseDataField() {
        responseData = [
            ...responseData,
            {
                name: "",
                type: "string",
                encrypt: false,
                decoded: false,
                description: "",
            },
        ];
    }

    function removeResponseDataField(index: number) {
        responseData = responseData.filter((_, i) => i !== index);
    }

    let customHeaders = $state<{ key: string; value: string }[]>([
        { key: "", value: "" },
    ]);

    function addHeader() {
        customHeaders = [...customHeaders, { key: "", value: "" }];
    }

    function removeHeader(index: number) {
        customHeaders = customHeaders.filter((_, i) => i !== index);
    }

    // Derived site options based on selected service
    let siteOptions = $derived(SERVICE_SITE_MAPPING[selectedService] || []);

    // Set default site when service changes
    $effect(() => {
        if (
            siteOptions.length > 0 &&
            !siteOptions.includes(selectedSite as any)
        ) {
            selectedSite = siteOptions[0];
        } else if (siteOptions.length === 0) {
            selectedSite = "";
        }
    });

    let contentType = $state("application/json");
    let charset = $state("UTF-8");

    // Default Content-Type logic
    $effect(() => {
        if (requestType === "REST") {
            contentType = "application/json";
        } else if (requestType === "FORM") {
            contentType = "application/x-www-form-urlencoded";
        }
    });

    let isBasicOpen = $state(true);
    let isRequestOpen = $state(true);
    let isConfigOpen = $state(true);
    let isResponseOpen = $state(true);

    function handleSave() {
        const newEndpoint: Endpoint = {
            id: crypto.randomUUID(),
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
                charset,
                customHeaders: customHeaders.filter((h) => h.key && h.value),
            },
            requestData,
            responseData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        // Save to LocalStorage
        endpointService.saveEndpoint(newEndpoint);
        console.log("Saved Endpoint:", newEndpoint);

        alert("Endpoint Saved!");
        goto("/");
    }

    function handleCancel() {
        goto("/");
    }
</script>

<div class="max-w-4xl mx-auto py-8 px-4">
    <Breadcrumbs
        items={[
            { label: "Home", href: "/" },
            { label: "Test Endpoint", href: "/endpoint" },
            { label: "New Endpoint" },
        ]}
    />
    <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            New Endpoint
        </h1>
        <p class="text-slate-500 dark:text-slate-400">
            Create a new API endpoint configuration for testing.
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
                                <label
                                    class="text-sm font-medium text-slate-700 dark:text-slate-300"
                                >
                                    Request Type
                                </label>
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
                                        <label
                                            class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            >Content-Type & Charset</label
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
                                        <label
                                            class="text-xs font-bold text-slate-500 uppercase tracking-wider"
                                            >Custom Headers</label
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
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr
                                        class="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-border-dark"
                                    >
                                        <th class="p-2 font-medium w-48"
                                            >Name <span class="text-red-500"
                                                >*</span
                                            ></th
                                        >
                                        <th class="p-2 font-medium w-16"
                                            >Type <span class="text-red-500"
                                                >*</span
                                            ></th
                                        >
                                        <th class="p-2 font-medium w-14"
                                            >Length</th
                                        >
                                        <th
                                            class="p-2 font-medium text-center w-16"
                                            >Req</th
                                        >
                                        <th
                                            class="p-2 font-medium text-center w-16"
                                            >Enc</th
                                        >
                                        <th
                                            class="p-2 font-medium text-center w-16"
                                            >UrlEnc</th
                                        >
                                        <th class="p-2 font-medium w-12"
                                            >Sign Order</th
                                        >
                                        <th class="p-2 font-medium"
                                            >Description</th
                                        >
                                        <th class="p-2 font-medium w-10"></th>
                                    </tr>
                                </thead>
                                <tbody class="text-sm">
                                    {#each requestData as field, i}
                                        <tr
                                            class="border-b border-slate-100 dark:border-border-dark/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <td class="p-2">
                                                <input
                                                    type="text"
                                                    bind:value={field.name}
                                                    placeholder="Field Name"
                                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                                                />
                                            </td>
                                            <td class="p-2">
                                                <div class="w-full">
                                                    <TypeSelector
                                                        bind:value={field.type}
                                                    />
                                                </div>
                                            </td>
                                            <td class="p-2">
                                                <input
                                                    type="number"
                                                    bind:value={field.length}
                                                    disabled={field.type !==
                                                        "string"}
                                                    placeholder={field.type ===
                                                    "string"
                                                        ? "Len"
                                                        : "-"}
                                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </td>
                                            <td class="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    bind:checked={
                                                        field.required
                                                    }
                                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                                />
                                            </td>
                                            <td class="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    bind:checked={field.encrypt}
                                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                                />
                                            </td>
                                            <td class="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    bind:checked={field.encoded}
                                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                                />
                                            </td>
                                            <td class="p-2">
                                                <input
                                                    type="number"
                                                    bind:value={
                                                        field.signingOrder
                                                    }
                                                    placeholder="No"
                                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </td>
                                            <td class="p-2">
                                                <input
                                                    type="text"
                                                    bind:value={
                                                        field.description
                                                    }
                                                    placeholder="Desc"
                                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                                                />
                                            </td>
                                            <td class="p-2 text-center">
                                                <button
                                                    onclick={() =>
                                                        removeRequestDataField(
                                                            i,
                                                        )}
                                                    class="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Remove Field"
                                                >
                                                    <span
                                                        class="material-symbols-outlined text-[20px]"
                                                        >delete</span
                                                    >
                                                </button>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>

                        <div class="flex gap-2">
                            <button
                                onclick={addRequestDataField}
                                class="px-3 py-2 text-sm font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <span
                                    class="material-symbols-outlined text-[18px]"
                                    >add</span
                                > Add Field
                            </button>
                            <button
                                onclick={() => (isJsonModalOpen = true)}
                                class="px-3 py-2 text-sm font-bold text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <span
                                    class="material-symbols-outlined text-[18px]"
                                    >data_object</span
                                > JSON
                            </button>
                        </div>
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
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr
                                        class="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-border-dark"
                                    >
                                        <th class="p-2 font-medium w-48"
                                            >Name <span class="text-red-500"
                                                >*</span
                                            ></th
                                        >
                                        <th class="p-2 font-medium w-16"
                                            >Type <span class="text-red-500"
                                                >*</span
                                            ></th
                                        >
                                        <th
                                            class="p-2 font-medium w-14 text-center"
                                            >Length</th
                                        >
                                        <th
                                            class="p-2 font-medium text-center w-16"
                                            >Enc</th
                                        >
                                        <th
                                            class="p-2 font-medium text-center w-16"
                                            >UrlDec</th
                                        >
                                        <th
                                            class="p-2 font-medium w-12 text-center"
                                            >Sign Order</th
                                        >
                                        <th class="p-2 font-medium"
                                            >Description</th
                                        >
                                        <th class="p-2 font-medium w-10"></th>
                                    </tr>
                                </thead>
                                <tbody class="text-sm">
                                    {#each responseData as field, i}
                                        <tr
                                            class="border-b border-slate-100 dark:border-border-dark/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <td class="p-2">
                                                <input
                                                    type="text"
                                                    bind:value={field.name}
                                                    placeholder="Field Name"
                                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                                                />
                                            </td>
                                            <td class="p-2">
                                                <div class="w-full">
                                                    <TypeSelector
                                                        bind:value={field.type}
                                                    />
                                                </div>
                                            </td>
                                            <td class="p-2">
                                                <input
                                                    type="number"
                                                    bind:value={field.length}
                                                    disabled={field.type !==
                                                        "string"}
                                                    placeholder={field.type ===
                                                    "string"
                                                        ? "Len"
                                                        : "-"}
                                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </td>
                                            <td class="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    bind:checked={field.encrypt}
                                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                                />
                                            </td>
                                            <td class="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    bind:checked={field.decoded}
                                                    class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/50"
                                                />
                                            </td>
                                            <td class="p-2 text-center">
                                                <input
                                                    type="number"
                                                    bind:value={
                                                        field.signingOrder
                                                    }
                                                    disabled={requestType !==
                                                        "FORM"}
                                                    placeholder={requestType ===
                                                    "FORM"
                                                        ? "No"
                                                        : "-"}
                                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-900/50"
                                                />
                                            </td>
                                            <td class="p-2">
                                                <input
                                                    type="text"
                                                    bind:value={
                                                        field.description
                                                    }
                                                    placeholder="Desc"
                                                    class="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-1 focus:ring-primary/50 outline-none"
                                                />
                                            </td>
                                            <td class="p-2 text-center">
                                                <button
                                                    onclick={() =>
                                                        removeResponseDataField(
                                                            i,
                                                        )}
                                                    class="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Remove Field"
                                                >
                                                    <span
                                                        class="material-symbols-outlined text-[20px]"
                                                        >delete</span
                                                    >
                                                </button>
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>

                        <div class="flex gap-2">
                            <button
                                onclick={addResponseDataField}
                                class="px-3 py-2 text-sm font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <span
                                    class="material-symbols-outlined text-[18px]"
                                    >add</span
                                > Add Field
                            </button>
                            <button
                                onclick={() => (isResponseJsonModalOpen = true)}
                                class="px-3 py-2 text-sm font-bold text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-500 dark:hover:text-green-400 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-1"
                            >
                                <span
                                    class="material-symbols-outlined text-[18px]"
                                    >data_object</span
                                > JSON
                            </button>
                        </div>
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
                    Save Endpoint
                </button>
            </div>
        </div>
    </div>
</div>
