<script lang="ts">
    import Modal from "./Modal.svelte";

    interface Props {
        isOpen: boolean;
        title?: string;
        message: string;
        type?: "alert" | "confirm";
        confirmText?: string;
        cancelText?: string;
        onConfirm?: () => void;
        onCancel?: () => void;
    }

    let {
        isOpen = $bindable(),
        title = "Notification",
        message,
        type = "alert",
        confirmText = "OK",
        cancelText = "Cancel",
        onConfirm,
        onCancel,
    }: Props = $props();

    function handleConfirm() {
        if (onConfirm) onConfirm();
        isOpen = false;
    }

    function handleCancel() {
        if (onCancel) onCancel();
        isOpen = false;
    }
</script>

<Modal bind:isOpen {title} onClose={handleCancel}>
    <div class="space-y-6">
        <p
            class="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed"
        >
            {message}
        </p>

        <div class="flex justify-end gap-3 pt-2">
            {#if type === "confirm"}
                <button
                    class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
                    onclick={handleCancel}
                >
                    {cancelText}
                </button>
            {/if}
            <button
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-900 transition-colors"
                onclick={handleConfirm}
            >
                {confirmText}
            </button>
        </div>
    </div>
</Modal>
