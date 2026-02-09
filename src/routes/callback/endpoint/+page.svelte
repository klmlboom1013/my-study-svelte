<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";

    export let data; // GET data
    export let form; // POST data

    // Log for debugging
    $: {
        console.log("[Callback Page] Internal Data:", { data, form });
    }

    // Merge data from GET or POST
    $: resultData = (form?.data || data?.data || {}) as Record<string, string>;
    $: method = form?.method || data?.method || "UNKNOWN";
    // @ts-ignore
    $: error = form?.error || null;

    let isSession = false;

    onMount(() => {
        // Send result to parent window via BroadcastChannel
        const bc = new BroadcastChannel("wpay_channel");

        // 0. Listen for close signal from parent
        bc.onmessage = (event) => {
            // Placeholder: parent now manages window lifecycle directly
        };

        // Send "READY" signal to parent multiple times to ensure it's caught
        // (Handles cases where parent starts listening after popup starts loading)
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (bc) bc.postMessage({ type: "WPAY_READY" });
            }, i * 500);
        }

        // Ensure resultData contains an actual result from WPAY (resultCode or resCode)
        const hasActualResult = !!(resultData.resultCode || resultData.resCode);

        if (hasActualResult) {
            console.log(
                "[Callback] Sending actual result to parent:",
                resultData,
            );
            bc.postMessage({
                type: "WPAY_RESULT",
                data: resultData,
            });

            // Fallback for window.opener
            if (window.opener) {
                window.opener.postMessage(
                    {
                        type: "WPAY_RESULT",
                        data: resultData,
                    },
                    "*",
                );
            }

            // Always close the popup after a short delay
            setTimeout(() => {
                bc.close();
                window.close();
            }, 2500);
        } else {
            console.log(
                "[Callback] No result data to send yet. Waiting for signals...",
            );
        }

        return () => {
            bc.close();
        };
    });
</script>

<div
    class="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900"
>
    <div
        class="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-sm w-full mx-4"
    >
        <div class="mb-6">
            <div
                class="size-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"
            >
                <span
                    class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[32px]"
                    >sync</span
                >
            </div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Processing Interface Data...
            </h1>
            <p class="text-sm text-slate-500 dark:text-slate-400">
                Please wait while we complete the data transfer to {method ===
                "POST"
                    ? "server"
                    : "requester"}.
            </p>
        </div>

        {#if Object.keys(resultData).length > 0}
            <div
                class="py-3 px-4 rounded-lg text-xs font-medium border bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100"
            >
                <div class="flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[16px]"
                        >check_circle</span
                    >
                    Data received. Closing window...
                </div>
            </div>
        {:else if method === "UNKNOWN"}
            <div
                class="py-3 px-4 rounded-lg text-xs font-medium border bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100"
            >
                <div class="flex items-center justify-center gap-2">
                    <span
                        class="material-symbols-outlined text-[16px] animate-spin"
                        >sync</span
                    >
                    Waiting for callback data...
                </div>
            </div>
        {:else}
            <div
                class="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/30"
            >
                <span
                    class="material-symbols-outlined text-red-600 dark:text-red-400 text-[48px] mb-4"
                    >error</span
                >
                <h1
                    class="text-sm font-bold text-red-800 dark:text-red-300 mb-2"
                >
                    데이터가 감지되지 않았습니다
                </h1>
                <p
                    class="text-[11px] text-red-600 dark:text-red-400 leading-normal"
                >
                    전달된 {method} 데이터가 비어있거나 올바르지 않습니다.<br />
                    서비스 설정을 확인해 주세요.
                </p>
                <button
                    on:click={() => window.close()}
                    class="mt-4 px-4 py-2 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                >
                    창 닫기
                </button>
            </div>
        {/if}

        <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <p class="text-[10px] text-slate-400 italic">
                This window will close automatically.
            </p>
        </div>
    </div>
</div>
