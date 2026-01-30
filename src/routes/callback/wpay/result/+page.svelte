<script lang="ts">
    import { onMount } from "svelte";

    // 'form' prop comes from the form action result
    export let form: { success: boolean; data: Record<string, string> } | null;

    onMount(() => {
        console.log("Callback Page Mounted. Form data:", form);

        // 0. Listen for close signal from parent
        const closeBc = new BroadcastChannel("wpay_channel");
        closeBc.onmessage = (event) => {
            if (event.data?.type === "WPAY_CLOSE") {
                console.log("Received CLOSE signal from parent. Closing...");
                closeBc.close();
                window.close();
            }
        };

        if (form && form.success && form.data) {
            // 1. Try BroadcastChannel (Fallback/Primary mechanism)
            try {
                const bc = new BroadcastChannel("wpay_channel");
                console.log(
                    "Posting message via BroadcastChannel...",
                    form.data,
                );
                bc.postMessage({ type: "WPAY_RESULT", data: form.data });
                bc.close();
            } catch (e) {
                console.error("BroadcastChannel failed:", e);
            }

            // 2. Try window.opener (Legacy/Standard mechanism)
            if (window.opener) {
                console.log(
                    "Opener found. Posting message to opener...",
                    form.data,
                );
                window.opener.postMessage(
                    {
                        type: "WPAY_RESULT",
                        data: form.data,
                    },
                    "*",
                );
            } else {
                console.error("No window.opener found!");
            }

            const urlParams = new URLSearchParams(window.location.search);
            // CRITICAL: If the window name indicates a collection run, NEVER auto-close.
            // This is the most reliable way as window.name persists through redirects.
            const isCollectionRun =
                window.name && window.name.startsWith("col_run_");
            const isSession =
                urlParams.get("isSession") === "true" ||
                form.data?.isSession === "true" ||
                isCollectionRun;

            if (!isSession) {
                console.log("No session detected. Closing window in 3000ms...");
                setTimeout(() => {
                    closeBc.close();
                    window.close();
                }, 3000);
            } else {
                console.log(
                    `Workflow session detected (Name: ${window.name}). Keeping window open.`,
                );
            }
        } else {
            console.error("Form data missing or failed:", form);
        }

        return () => {
            closeBc.close();
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
                    >payments</span
                >
            </div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Processing Payment...
            </h1>
            <p class="text-sm text-slate-500 dark:text-slate-400">
                Please wait while we complete the transaction and verify the
                payment result.
            </p>
        </div>

        {#if form?.success}
            <div
                class="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 py-3 px-4 rounded-lg text-xs font-medium border border-emerald-100 dark:border-emerald-800/50"
            >
                <div class="flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[16px]"
                        >check_circle</span
                    >
                    Payment verified. Closing window...
                </div>
            </div>
        {:else if form}
            <div
                class="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 py-3 px-4 rounded-lg text-xs font-medium border border-rose-100 dark:border-rose-800/50"
            >
                <div class="flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[16px]"
                        >error</span
                    >
                    Payment failed or data missing.
                </div>
            </div>
        {/if}

        <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <p class="text-[10px] text-slate-400 italic">
                This window will close automatically.
            </p>
        </div>
    </div>
</div>
