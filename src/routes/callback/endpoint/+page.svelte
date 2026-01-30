<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";

    export let data; // GET data
    export let form; // POST data

    // Merge data from GET or POST
    $: resultData = form?.data || data?.data || {};
    $: method = form?.method || data?.method || "UNKNOWN";

    let isSession = false;

    onMount(() => {
        // Send result to parent window via BroadcastChannel
        const bc = new BroadcastChannel("wpay_channel");

        // 0. Listen for close signal from parent
        bc.onmessage = (event) => {
            if (event.data?.type === "WPAY_CLOSE") {
                console.log("Received CLOSE signal from parent. Closing...");
                bc.close();
                window.close();
            } else if (event.data?.type === "WPAY_CLEAR") {
                console.log("Received CLEAR signal. Navigating to blank...");
                window.location.href = "about:blank";
            } else if (event.data?.type === "WPAY_SUBMIT") {
                console.log(
                    "Received SUBMIT signal. Submitting form...",
                    event.data,
                );
                const { url, method, payload } = event.data;

                const form = document.createElement("form");
                form.action = url;
                form.method = method || "POST";
                form.target = "_self"; // Submit in this window

                if (payload) {
                    Object.entries(payload).forEach(([key, value]) => {
                        const input = document.createElement("input");
                        input.type = "hidden";
                        input.name = key;
                        input.value = String(value || "");
                        form.appendChild(input);
                    });
                }
                document.body.appendChild(form);
                form.submit();
            }
        };

        // Ensure resultData is not empty or handle specific success conditions if needed
        if (Object.keys(resultData).length > 0) {
            bc.postMessage({
                type: "WPAY_RESULT",
                data: resultData,
            });

            // Fallback for window.opener (if BroadcastChannel is not supported or for wider compatibility)
            if (window.opener) {
                window.opener.postMessage(
                    {
                        type: "WPAY_RESULT",
                        data: resultData,
                    },
                    "*",
                );
            }

            // Detect if this is a collection run to prevent auto-closure
            const urlParams = new URLSearchParams(window.location.search);
            const isCollectionRun = !!(
                window.name && window.name.startsWith("col_run_")
            );
            isSession =
                urlParams.get("isSession") === "true" ||
                resultData.isSession === "true" ||
                isCollectionRun;

            if (!isSession) {
                // Close the popup after a short delay to ensure message is sent
                setTimeout(() => {
                    bc.close();
                    window.close();
                }, 3000);
            } else {
                console.log(
                    `Workflow session detected (Name: ${window.name}). Keeping window open for next step.`,
                );
            }
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
                class="py-3 px-4 rounded-lg text-xs font-medium border {isSession
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100'}"
            >
                <div class="flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[16px]"
                        >{isSession ? "timer" : "check_circle"}</span
                    >
                    {#if isSession}
                        Data processed. Keeping window open...
                    {:else}
                        Data received. Closing window...
                    {/if}
                </div>
            </div>
        {/if}

        <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <p class="text-[10px] text-slate-400 italic">
                {#if isSession}
                    This window is being controlled by the collection workflow.
                {:else}
                    This window will close automatically.
                {/if}
            </p>
        </div>
    </div>
</div>
