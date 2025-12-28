<script lang="ts">
    import logo from "$lib/assets/favicon.svg"; // Assuming a logo or icon usage, but the code used material symbols.
    // The original code used material symbols directly. I will copy the markup exactly.
</script>

<header
    class="w-full bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-20"
>
    <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
            <div
                class="size-8 text-blue-600 flex items-center justify-center bg-blue-600/10 rounded-lg"
            >
                <span class="material-symbols-outlined text-2xl">school</span>
            </div>
            <h2
                class="text-lg font-bold tracking-tight text-slate-900 dark:text-white"
            >
                WPAY Service Test
            </h2>
        </div>
        <div class="relative group">
            <button
                class="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-help py-1 bg-transparent border-none p-0"
                type="button"
            >
                <span class="material-symbols-outlined text-lg">help</span>
                <span>Help</span>
            </button>
            <div
                class="absolute right-0 top-full mt-2 w-max max-w-sm px-3 py-2 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 z-50"
            >
                문의사항은 klmlboom@kggroup.co.kr 로 보내주세요
            </div>
        </div>
    </div>
</header>
