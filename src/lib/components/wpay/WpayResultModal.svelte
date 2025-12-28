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
    }

    let { data, onConfirm, onClose }: Props = $props();
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
            class="bg-primary dark:bg-slate-800 px-6 py-4 flex justify-between items-center shrink-0 border-b border-gray-200 dark:border-gray-700"
        >
            <h2 class="text-xl font-bold text-white tracking-tight">
                WPAY 요청 결과
            </h2>
            <button
                class="text-white hover:text-white/80 hover:bg-white/10 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                onclick={onClose}
            >
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        <div class="p-6 overflow-y-auto custom-scrollbar">
            <div
                class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
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
        </div>
        <div
            class="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end items-center shrink-0 border-t border-slate-200 dark:border-slate-700"
        >
            <button
                class="bg-primary hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-gray-900 cursor-pointer"
                onclick={onConfirm}
            >
                확인
            </button>
        </div>
    </div>
</div>
