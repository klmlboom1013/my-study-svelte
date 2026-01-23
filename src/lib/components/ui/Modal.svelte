<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { X } from "lucide-svelte";

    interface Props {
        isOpen: boolean;
        title: string;
        children?: import("svelte").Snippet;
        width?: string;
        onClose?: () => void;
        bodyClass?: string;
    }

    let {
        isOpen = $bindable(),
        title,
        children,
        width = "max-w-md",
        onClose,
        bodyClass = "p-6 text-text-message text-base font-medium max-h-[80vh] overflow-y-auto",
    }: Props = $props();

    function close() {
        isOpen = false;
        if (onClose) onClose();
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 200 }}
        onclick={(e) => {
            if (e.target === e.currentTarget) close();
        }}
        onkeydown={(e) => {
            if (
                e.target === e.currentTarget &&
                (e.key === "Enter" || e.key === " ")
            ) {
                e.preventDefault();
                close();
            }
        }}
        role="button"
        tabindex="0"
    >
        <!-- Modal Content -->
        <div
            class={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full ${width} overflow-hidden relative border border-transparent dark:border-slate-800`}
            transition:scale={{ duration: 200, start: 0.95 }}
            role="dialog"
            aria-modal="true"
            tabindex="-1"
        >
            <!-- Header -->
            <div
                class="bg-white dark:bg-slate-900 px-6 py-4 flex justify-between items-center text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800"
            >
                <h2 class="text-xl font-bold">{title}</h2>
                <button
                    onclick={close}
                    class="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <!-- Body -->
            <div class={bodyClass}>
                {@render children?.()}
            </div>
        </div>
    </div>
{/if}
