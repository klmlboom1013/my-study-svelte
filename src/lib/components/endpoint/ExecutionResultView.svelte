<script lang="ts">
    import {
        Copy,
        CopyCheck,
        ShieldCheck,
        CheckCircle,
        XCircle,
        LockOpen,
        Play,
    } from "lucide-svelte";
    import { fade, scale } from "svelte/transition";

    let {
        signatureRawString = undefined,
        requestUrl = undefined,
        jsonResult = undefined,
        responseResult = undefined,
        responseStatus = undefined,
        executionStage = undefined,
        responseValidationSuccess = null,
        responseSignatureRawString = undefined,
        responseCalculatedSignature = undefined,
        responseDecryptedData = [],
        onExecute = undefined, // New prop for FAB
    } = $props();

    let copiedSection = $state<string | null>(null);

    function handleCopy(text: string, section: string) {
        if (!text) return;
        navigator.clipboard.writeText(text);
        copiedSection = section;
        setTimeout(() => {
            if (copiedSection === section) copiedSection = null;
        }, 2000);
    }
</script>

<!-- Request URL Display -->
{#if requestUrl}
    <div
        class="rounded-lg border border-slate-200 dark:border-border-dark overflow-hidden shrink-0 mb-4"
    >
        <div
            class="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-border-dark font-medium text-sm text-slate-700 dark:text-slate-300 flex justify-between items-center"
        >
            <span>Endpoint URL</span>
            <button
                onclick={() => handleCopy(requestUrl, "url")}
                class="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"
                title="Copy to clipboard"
            >
                {#if copiedSection === "url"}
                    <CopyCheck size={14} class="text-green-500" />
                {:else}
                    <Copy size={14} />
                {/if}
            </button>
        </div>
        <div
            class="p-4 bg-white dark:bg-slate-950/50 font-mono text-xs text-slate-600 dark:text-slate-400 break-all"
        >
            {requestUrl}
        </div>
    </div>
{/if}

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
                onclick={() => handleCopy(signatureRawString, "signature")}
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

<!-- Execution Result (Request Parameters) -->
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
        <div class="relative group/params">
            <pre
                class="p-4 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-50 overflow-x-auto text-sm font-mono scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent min-h-[60px] whitespace-pre-wrap break-all">{jsonResult}</pre>

            {#if onExecute}
                <div class="absolute bottom-4 right-4" transition:scale>
                    <button
                        onclick={onExecute}
                        class="h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group/fab"
                        title="Execute this step"
                    >
                        <Play
                            size={18}
                            fill="currentColor"
                            class="ml-0.5 group-hover/fab:animate-pulse"
                        />
                    </button>
                </div>
            {/if}
        </div>
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
                <span class="text-slate-700 dark:text-slate-300">Response</span>
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
                onclick={() => handleCopy(responseResult, "response")}
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
            class="p-4 bg-slate-50 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 overflow-x-auto text-sm font-mono scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent min-h-[100px]">{responseResult}</pre>
    </div>
{/if}

<!-- Response Validation Section -->
{#if executionStage === "EXECUTE" && responseResult && (responseValidationSuccess !== null || responseDecryptedData.length > 0)}
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
                <div class="flex items-center gap-3 mb-3">
                    <span
                        class="text-sm font-semibold text-slate-700 dark:text-slate-300"
                        >Signature Verification</span
                    >
                    <span
                        class={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${responseValidationSuccess ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}
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
                        <div class="flex justify-between items-center mb-1">
                            <div class="text-xs text-slate-500">
                                Source String
                            </div>
                            <button
                                onclick={() =>
                                    handleCopy(
                                        responseSignatureRawString,
                                        "val_source",
                                    )}
                                class="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"
                                title="Copy to clipboard"
                            >
                                {#if copiedSection === "val_source"}
                                    <CopyCheck
                                        size={12}
                                        class="text-green-500"
                                    />
                                {:else}
                                    <Copy size={12} />
                                {/if}
                            </button>
                        </div>
                        <div
                            class="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono break-all text-slate-600 dark:text-slate-400"
                        >
                            {responseSignatureRawString}
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <div class="text-xs text-slate-500">
                                Generated Signature
                            </div>
                            <button
                                onclick={() =>
                                    handleCopy(
                                        responseCalculatedSignature,
                                        "val_sig",
                                    )}
                                class="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500"
                                title="Copy to clipboard"
                            >
                                {#if copiedSection === "val_sig"}
                                    <CopyCheck
                                        size={12}
                                        class="text-green-500"
                                    />
                                {:else}
                                    <Copy size={12} />
                                {/if}
                            </button>
                        </div>
                        <div
                            class="bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 text-xs font-mono break-all text-slate-600 dark:text-slate-400"
                        >
                            {responseCalculatedSignature}
                        </div>
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
                        >Decrypted / Decoded Data</span
                    >
                </div>
                <div class="space-y-2">
                    {#each responseDecryptedData as item}
                        <div
                            class="bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 p-3"
                        >
                            <div class="flex justify-between items-start mb-1">
                                <span
                                    class="text-xs font-bold text-slate-700 dark:text-slate-300"
                                    >{item.name}</span
                                >
                                <span
                                    class="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                                >
                                    {item.type}
                                </span>
                            </div>
                            <div
                                class="text-xs text-emerald-600 dark:text-emerald-400 font-mono break-all"
                            >
                                {item.value}
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
{/if}
