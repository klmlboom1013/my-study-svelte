<script lang="ts">
    import { fade } from "svelte/transition";

    let { isOpen = false, message = "Processing..." } = $props();
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm"
        transition:fade={{ duration: 200 }}
    >
        <div
            class="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700"
        >
            <div class="relative flex items-center justify-center">
                <!-- Outer Spin -->
                <div
                    class="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"
                ></div>
                <!-- Inner Pulse -->
                <div
                    class="absolute size-8 bg-primary/20 rounded-full animate-pulse"
                ></div>
            </div>

            <div class="flex flex-col items-center gap-1">
                <p class="text-lg font-semibold text-slate-900 dark:text-white">
                    {message}
                </p>
                <p
                    class="text-xs text-slate-500 dark:text-slate-400 animate-pulse"
                >
                    Please wait a moment.
                </p>
            </div>
        </div>
    </div>
{/if}
