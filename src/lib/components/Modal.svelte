<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { X } from "lucide-svelte";

    interface Props {
        isOpen: boolean;
        title: string;
        children?: import("svelte").Snippet;
    }

    let { isOpen = $bindable(), title, children }: Props = $props();

    function close() {
        isOpen = false;
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        transition:fade={{ duration: 200 }}
        onclick={close}
        role="dialog"
        aria-modal="true"
    >
        <!-- Modal Content -->
        <div
            class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative"
            transition:scale={{ duration: 200, start: 0.95 }}
            onclick={(e) => e.stopPropagation()}
            role="document"
        >
            <!-- Header -->
            <div
                class="bg-blue-500 px-6 py-4 flex justify-between items-center text-white"
            >
                <h2 class="text-xl font-bold">{title}</h2>
                <button
                    onclick={close}
                    class="hover:bg-blue-600 p-1 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <!-- Body -->
            <div class="p-6">
                {@render children?.()}
            </div>
        </div>
    </div>
{/if}
