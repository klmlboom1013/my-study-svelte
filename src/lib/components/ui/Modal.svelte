<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import { X } from "lucide-svelte";

    interface Props {
        isOpen: boolean;
        title: string;
        children?: import("svelte").Snippet;
        width?: string;
    }

    let {
        isOpen = $bindable(),
        title,
        children,
        width = "max-w-md",
    }: Props = $props();

    function close() {
        isOpen = false;
    }
</script>

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
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
            class={`bg-white rounded-xl shadow-2xl w-full ${width} overflow-hidden relative`}
            transition:scale={{ duration: 200, start: 0.95 }}
            role="dialog"
            aria-modal="true"
            tabindex="-1"
        >
            <!-- Header -->
            <div
                class="bg-brand-primary px-6 py-4 flex justify-between items-center text-text-white"
            >
                <h2 class="text-xl font-bold">{title}</h2>
                <button
                    onclick={close}
                    class="hover:bg-white/10 p-1 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <!-- Body -->
            <div
                class="p-6 text-text-message text-base font-medium max-h-[80vh] overflow-y-auto"
            >
                {@render children?.()}
            </div>
        </div>
    </div>
{/if}
