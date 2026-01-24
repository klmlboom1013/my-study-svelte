<script lang="ts">
    import { onMount } from "svelte";

    // 'form' prop comes from the form action result
    export let form: { success: boolean; data: Record<string, string> } | null;

    onMount(() => {
        console.log("Callback Page Mounted. Form data:", form);
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

            console.log("Closing window in 3000ms...");
            setTimeout(() => {
                window.close();
            }, 3000);
        } else {
            console.error("Form data missing or failed:", form);
        }
    });
</script>

<div class="flex items-center justify-center h-screen bg-gray-100">
    <div class="text-center p-8 bg-white rounded shadow-md">
        <h1 class="text-xl font-bold mb-4">Processing Payment...</h1>
        <p>Please wait while we complete the transaction.</p>
        {#if form}
            <p class="text-sm text-gray-500 mt-2">
                Data received. Closing window...
            </p>
        {/if}
    </div>
</div>
