<script lang="ts">
    import { fade, scale } from "svelte/transition";

    interface ResultItem {
        key: string;
        label: string;
        encrypted: string;
        decrypted: string;
    }

    interface Props {
        data: ResultItem[];
        onConfirm: () => void;
        onClose: () => void;
        title?: string;
        buttonText?: string;
    }

    let {
        data,
        onConfirm,
        onClose,
        title = "WPAY 요청 결과",
        buttonText = "확인",
    }: Props = $props();
</script>

<div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    transition:fade={{ duration: 200 }}
>
    <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onclick={onClose}
        aria-hidden="true"
    ></div>
    <div
        class="relative w-full max-w-5xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        transition:scale={{ duration: 200, start: 0.95 }}
    >
        <div
            class="bg-white dark:bg-slate-800 px-6 py-4 flex justify-between items-center shrink-0 border-b border-gray-200 dark:border-gray-700"
        >
            <h2
                class="text-xl font-bold text-slate-900 dark:text-white tracking-tight"
            >
                {title}
            </h2>
            <button
                class="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500/50 cursor-pointer"
                onclick={onClose}
            >
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="p-6 overflow-y-auto custom-scrollbar">
            <!-- Desktop View (Table) -->
            <div
                class="hidden md:block border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
            >
                <table class="w-full text-left text-sm border-collapse">
                    <thead
                        class="bg-slate-500 border-b border-slate-200 dark:border-slate-700"
                    >
                        <tr>
                            <th
                                class="px-4 py-3 font-bold text-white w-1/4 border-r border-slate-200 dark:border-slate-700"
                                >항목 (Key)</th
                            >
                            <th
                                class="px-4 py-3 font-bold text-white w-1/3 border-r border-slate-200 dark:border-slate-700"
                                >값 (Encrypted/Raw)</th
                            >
                            <th class="px-4 py-3 font-bold text-white w-1/3"
                                >해독 값 (Decrypted)</th
                            >
                        </tr>
                    </thead>
                    <tbody
                        class="divide-y divide-slate-200 dark:divide-slate-700"
                    >
                        {#each data as item}
                            <tr
                                class="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <td
                                    class="px-4 py-3 border-r border-slate-200 dark:border-slate-700 align-top"
                                >
                                    <div
                                        class="font-bold text-slate-900 dark:text-white"
                                    >
                                        {item.label}
                                    </div>
                                    <div
                                        class="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5"
                                    >
                                        {item.key}
                                    </div>
                                </td>
                                <td
                                    class="px-4 py-3 border-r border-slate-200 dark:border-slate-700 font-mono text-slate-500 dark:text-slate-400 text-xs align-top break-all leading-relaxed"
                                >
                                    {item.encrypted}
                                </td>
                                <td
                                    class="px-4 py-3 text-slate-900 dark:text-white font-medium align-top break-all text-sm leading-relaxed"
                                >
                                    {item.decrypted}
                                </td>
                            </tr>
                        {/each}
                        {#if data.length === 0}
                            <tr>
                                <td
                                    colspan="3"
                                    class="px-4 py-8 text-center text-slate-500"
                                >
                                    데이터가 없습니다.
                                </td>
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>

            <!-- Mobile View (Cards) -->
            <div class="md:hidden space-y-4">
                {#each data as item}
                    <div
                        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm"
                    >
                        <div
                            class="mb-3 border-b border-slate-100 dark:border-slate-700 pb-2"
                        >
                            <span
                                class="block font-bold text-slate-900 dark:text-white text-lg"
                                >{item.label}</span
                            >
                            <span
                                class="block text-xs font-mono text-slate-500 dark:text-slate-400"
                                >{item.key}</span
                            >
                        </div>

                        <div class="space-y-3">
                            <div>
                                <div
                                    class="text-xs font-semibold text-slate-500 uppercase mb-1"
                                >
                                    값 (Encrypted/Raw)
                                </div>
                                <div
                                    class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded text-xs font-mono text-slate-600 dark:text-slate-300 break-all border border-slate-100 dark:border-slate-700"
                                >
                                    {item.encrypted}
                                </div>
                            </div>

                            <div>
                                <div
                                    class="text-xs font-semibold text-slate-500 uppercase mb-1"
                                >
                                    해독 값 (Decrypted)
                                </div>
                                <div
                                    class="text-sm font-medium text-slate-900 dark:text-white break-all pl-1"
                                >
                                    {item.decrypted}
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
                {#if data.length === 0}
                    <div class="text-center py-8 text-slate-500">
                        데이터가 없습니다.
                    </div>
                {/if}
            </div>
        </div>
        <div
            class="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end items-center shrink-0 border-t border-slate-200 dark:border-slate-700"
        >
            <button
                class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 dark:focus:ring-offset-gray-900 cursor-pointer"
                onclick={onConfirm}
            >
                {buttonText}
            </button>
        </div>
    </div>
</div>
