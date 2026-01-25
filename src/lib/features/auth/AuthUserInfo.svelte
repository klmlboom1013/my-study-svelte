<script lang="ts">
    import { User, Smartphone } from "lucide-svelte";

    let {
        userId = $bindable(),
        hNum = $bindable(),
        isSaveCache = $bindable(),
        highlightMissing = false,
    } = $props();

    function handlePhoneInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const clean = target.value.replace(/[^0-9]/g, "");
        hNum = clean;
        target.value = clean;
    }
</script>

<div class="space-y-4 pt-2">
    <div class="space-y-1.5">
        <label for="userId" class="text-xs font-bold text-slate-500 ml-1"
            >User Identification</label
        >
        <div class="relative group">
            <div
                class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors"
            >
                <User size={18} />
            </div>
            <input
                id="userId"
                bind:value={userId}
                type="text"
                placeholder="Enter User ID (e.g. wpayTestUser01)"
                class="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
        </div>
    </div>

    <div class="space-y-1.5">
        <div class="flex justify-between items-center ml-1">
            <label
                for="hNum"
                class="text-xs font-bold {highlightMissing && !hNum
                    ? 'text-amber-600'
                    : 'text-slate-500'} transition-colors"
                >Phone Number (Optional)</label
            >
            <span class="text-[10px] font-bold text-slate-400 uppercase"
                >Digits only</span
            >
        </div>
        <div class="relative group">
            <div
                class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors"
            >
                <Smartphone size={18} />
            </div>
            <input
                id="hNum"
                type="text"
                bind:value={hNum}
                oninput={handlePhoneInput}
                placeholder="Enter Phone Number (e.g. 01012345678)"
                class="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
            />
        </div>
        {#if highlightMissing && !hNum}
            <p class="text-[10px] font-bold text-amber-600 ml-1">
                Hint: Provide phone number to check existing membership.
            </p>
        {/if}
    </div>

    <div class="flex justify-end pt-1">
        <label class="flex items-center gap-2 cursor-pointer select-none group">
            <span
                class="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors"
                >Remember configuration</span
            >
            <div class="relative">
                <input
                    type="checkbox"
                    bind:checked={isSaveCache}
                    class="sr-only peer"
                />
                <div
                    class="w-10 h-5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:bg-blue-500 transition-colors"
                ></div>
                <div
                    class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-transform"
                ></div>
            </div>
        </label>
    </div>
</div>
