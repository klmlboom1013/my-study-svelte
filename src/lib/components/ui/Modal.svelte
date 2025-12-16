<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let isOpen: boolean = false;
    export let title: string = "";

    const dispatch = createEventDispatcher();

    function close() {
        isOpen = false;
        dispatch("close");
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape" && isOpen) {
            close();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
    <!-- Backdrop -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        on:click={close}
    >
        <!-- Content -->
        <div
            class="w-full max-w-md p-6 bg-white rounded-lg shadow-xl"
            on:click|stopPropagation
        >
            {#if title}
                <h2 class="text-lg font-bold text-gray-900 mb-4">{title}</h2>
            {/if}

            <div class="mb-6">
                <slot />
            </div>

            <div class="flex justify-end gap-2">
                <slot name="footer">
                    <button
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        on:click={close}
                    >
                        Close
                    </button>
                </slot>
            </div>
        </div>
    </div>
{/if}
