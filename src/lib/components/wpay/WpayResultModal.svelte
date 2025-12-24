<script lang="ts">
    import Modal from "$lib/components/ui/Modal.svelte";
    import Button from "$lib/components/ui/Button.svelte";

    interface ResultItem {
        key: string;
        label: string;
        encrypted: string;
        decrypted: string;
    }

    interface Props {
        isOpen: boolean;
        title: string;
        resultData: ResultItem[];
        confirmText?: string;
        onConfirm: () => void;
        onSignUp?: () => void;
        onClose: () => void;
    }

    let {
        isOpen = $bindable(),
        title,
        resultData,
        confirmText = "확인",
        onConfirm,
        onSignUp,
        onClose,
    }: Props = $props();
</script>

<Modal bind:isOpen {title} {onClose} width="max-w-4xl">
    <div class="flex flex-col gap-4">
        <div class="overflow-x-auto max-h-[60vh]">
            <table
                class="w-full text-sm border-collapse border border-gray-200 table-fixed"
            >
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th
                            class="border border-gray-200 p-2 text-left w-[20%] text-gray-700"
                            >항목 (Key)</th
                        >
                        <th
                            class="border border-gray-200 p-2 text-left w-[40%] text-gray-700"
                            >값 (Encrypted/Raw)</th
                        >
                        <th
                            class="border border-gray-200 p-2 text-left w-[40%] text-gray-700"
                            >해독 값 (Decrypted)</th
                        >
                    </tr>
                </thead>
                <tbody>
                    {#each resultData as item}
                        <tr class="hover:bg-gray-50">
                            <td
                                class="border border-gray-200 p-2 font-medium text-gray-600 align-top"
                            >
                                <div class="font-bold">{item.label}</div>
                                <div class="text-xs text-gray-400 font-mono">
                                    {item.key}
                                </div>
                            </td>
                            <td
                                class="border border-gray-200 p-2 break-all font-mono text-xs text-gray-500 align-top"
                                >{item.encrypted}</td
                            >
                            <td
                                class="border border-gray-200 p-2 break-all text-gray-800 align-top"
                                >{item.decrypted}</td
                            >
                        </tr>
                    {/each}
                    {#if resultData.length === 0}
                        <tr>
                            <td
                                colspan="3"
                                class="border border-gray-200 p-4 text-center text-gray-500"
                            >
                                데이터가 없습니다.
                            </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>

        <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
            {#if onSignUp}
                <Button
                    onClick={onSignUp}
                    className="bg-gray-500 hover:bg-gray-600 border-gray-500"
                >
                    회원가입
                </Button>
            {/if}
            <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
    </div>
</Modal>
