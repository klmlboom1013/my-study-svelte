<script lang="ts">
    import {
        Save,
        History,
        RotateCcw,
        Bookmark,
        CloudUpload,
        CloudDownload,
        Trash2,
        ChevronDown,
        Check,
        Loader2,
        Play,
        X,
    } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";
    import type { Endpoint } from "$lib/types/endpoint";
    import type { ExecutionPreset } from "$lib/features/execution/services/executionService";
    import { authStore } from "$lib/features/auth/services/authService";

    let {
        endpoint,
        selectedDomainPrefix = $bindable(),
        availableDomains,
        presets,
        isExecuting,
        executionStage,
        isBackingUp = false,
        isRestoring = false,
        isMobile,
        isButtonInView = $bindable(true),
        onBackup,
        onRestore,
        onLoadPreset,
        onDeletePreset,
        onSavePreset,
        onReset,
        onExecute,
        onClose,
        headerRef = $bindable(),
    } = $props();

    let isPresetDropdownOpen = $state(false);
    let showSavePresetDialog = $state(false);
    let newPresetName = $state("");
    let executeButtonRef = $state<HTMLElement | null>(null);

    $effect(() => {
        if (!executeButtonRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                isButtonInView = entry.isIntersecting;
            },
            {
                threshold: 0,
            },
        );

        observer.observe(executeButtonRef);

        return () => {
            observer.disconnect();
        };
    });

    function handleSave() {
        if (!newPresetName.trim()) return;
        onSavePreset(newPresetName);
        newPresetName = "";
        showSavePresetDialog = false;
    }

    function togglePresets(e: MouseEvent) {
        e.stopPropagation();
        isPresetDropdownOpen = !isPresetDropdownOpen;
    }
</script>

<div
    bind:this={headerRef}
    class="p-4 md:p-5 bg-slate-50 dark:bg-card-dark border-b border-slate-200 dark:border-border-dark shadow-sm z-10 flex flex-col md:flex-row md:justify-between md:items-start gap-4"
>
    <div class="flex flex-col gap-3 flex-1 min-w-0">
        <!-- Row 1: App & Method -->
        <div class="flex items-center gap-2">
            <span
                class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            >
                {endpoint?.application}
            </span>
            <span
                class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
                {endpoint?.method}
            </span>
        </div>

        <!-- Row 2: Name & Actions -->
        <div
            class="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
            <h3
                class="font-bold text-xl text-slate-900 dark:text-white leading-tight flex-1 min-w-0"
            >
                {endpoint?.name}
            </h3>

            <div class="flex items-center gap-2 shrink-0">
                <!-- Desktop Actions -->
                <div class="hidden md:flex items-center gap-2">
                    <div class="flex items-center gap-2">
                        <button
                            onclick={onBackup}
                            disabled={isBackingUp || isRestoring}
                            class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            title={$authStore.accessToken
                                ? "Backup to Drive"
                                : "Connect Google Drive to Backup"}
                        >
                            {#if isBackingUp}
                                <Loader2 size={16} class="animate-spin" />
                            {:else}
                                <CloudUpload size={16} />
                            {/if}
                            <span class="hidden lg:inline">Backup</span>
                        </button>
                        <button
                            onclick={onRestore}
                            disabled={isBackingUp || isRestoring}
                            class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            title={$authStore.accessToken
                                ? "Restore from Drive"
                                : "Connect Google Drive to Restore"}
                        >
                            {#if isRestoring}
                                <Loader2 size={16} class="animate-spin" />
                            {:else}
                                <CloudDownload size={16} />
                            {/if}
                            <span class="hidden lg:inline">Restore</span>
                        </button>
                    </div>

                    <div class="relative">
                        <button
                            onclick={togglePresets}
                            class="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors {isPresetDropdownOpen
                                ? 'bg-slate-50 dark:bg-slate-700'
                                : ''}"
                        >
                            <Bookmark size={16} />
                            <span>Preset</span>
                            <ChevronDown size={14} />
                        </button>

                        {#if isPresetDropdownOpen}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                transition:fade={{ duration: 150 }}
                                class="absolute right-0 top-full mt-1 w-60 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-[60] overflow-hidden"
                                onclick={(e) => e.stopPropagation()}
                            >
                                <div class="max-h-[300px] overflow-y-auto p-1">
                                    {#if presets.length > 0}
                                        <div
                                            class="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >
                                            Saved Presets
                                        </div>
                                        {#each presets as preset}
                                            <div
                                                class="flex items-center justify-between group/item hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-2 py-1.5"
                                            >
                                                <button
                                                    onclick={() => {
                                                        onLoadPreset(preset);
                                                        isPresetDropdownOpen = false;
                                                    }}
                                                    class="flex-1 text-left text-sm text-slate-700 dark:text-slate-200 truncate pr-2"
                                                >
                                                    {preset.name}
                                                </button>
                                                <button
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        onDeletePreset(
                                                            preset.id,
                                                        );
                                                    }}
                                                    class="text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity p-1"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        {/each}
                                        <div
                                            class="h-px bg-slate-100 dark:bg-slate-800 my-1"
                                        ></div>
                                    {/if}
                                    <button
                                        onclick={() => {
                                            showSavePresetDialog = true;
                                            isPresetDropdownOpen = false;
                                        }}
                                        class="w-full flex items-center gap-2 px-2 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    >
                                        <Save size={14} />
                                        <span>Save Current Values</span>
                                    </button>
                                    <button
                                        onclick={() => {
                                            onReset();
                                            isPresetDropdownOpen = false;
                                        }}
                                        class="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                                    >
                                        <RotateCcw size={14} />
                                        <span>Reset to Defaults</span>
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>

                    <button
                        bind:this={executeButtonRef}
                        onclick={onExecute}
                        disabled={isExecuting}
                        class="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shrink-0 rounded-lg shadow-sm disabled:opacity-70 disabled:scale-100 {executionStage ===
                        'READY'
                            ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                            : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'}"
                    >
                        {#if isExecuting}
                            <Loader2 size={16} class="animate-spin" />
                            Executing...
                        {:else if executionStage === "READY"}
                            <Check size={16} />
                            Ready
                        {:else}
                            <Play size={16} fill="currentColor" />
                            Execute
                        {/if}
                    </button>
                </div>

                <!-- Mobile Action Buttons -->
                <div class="md:hidden mt-0 flex items-center gap-2">
                    {#if $authStore.accessToken}
                        <button
                            onclick={onBackup}
                            disabled={isBackingUp || isRestoring}
                            class="flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50"
                        >
                            {#if isBackingUp}
                                <Loader2 size={20} class="animate-spin" />
                            {:else}
                                <CloudUpload size={20} />
                            {/if}
                        </button>
                        <button
                            onclick={onRestore}
                            disabled={isBackingUp || isRestoring}
                            class="flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50"
                        >
                            {#if isRestoring}
                                <Loader2 size={20} class="animate-spin" />
                            {:else}
                                <CloudDownload size={20} />
                            {/if}
                        </button>
                    {/if}

                    <div class="relative">
                        <button
                            onclick={togglePresets}
                            class="flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg {isPresetDropdownOpen
                                ? 'bg-slate-50 dark:bg-slate-700'
                                : ''}"
                        >
                            <Bookmark size={20} />
                        </button>

                        {#if isPresetDropdownOpen}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                transition:fade={{ duration: 150 }}
                                class="absolute left-0 top-full mt-1 w-60 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 z-[70] overflow-hidden"
                                onclick={(e) => e.stopPropagation()}
                            >
                                <div class="max-h-[300px] overflow-y-auto p-1">
                                    {#if presets.length > 0}
                                        <div
                                            class="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >
                                            Saved Presets
                                        </div>
                                        {#each presets as preset}
                                            <div
                                                class="flex items-center justify-between group/item hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-2 py-1.5"
                                            >
                                                <button
                                                    onclick={() => {
                                                        onLoadPreset(preset);
                                                        isPresetDropdownOpen = false;
                                                    }}
                                                    class="flex-1 text-left text-sm text-slate-700 dark:text-slate-200 truncate pr-2"
                                                >
                                                    {preset.name}
                                                </button>
                                                <button
                                                    onclick={(e) => {
                                                        e.stopPropagation();
                                                        onDeletePreset(
                                                            preset.id,
                                                        );
                                                    }}
                                                    class="text-slate-400 hover:text-red-500 p-1"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        {/each}
                                        <div
                                            class="h-px bg-slate-100 dark:bg-slate-800 my-1"
                                        ></div>
                                    {/if}
                                    <button
                                        onclick={() => {
                                            showSavePresetDialog = true;
                                            isPresetDropdownOpen = false;
                                        }}
                                        class="w-full flex items-center gap-2 px-2 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    >
                                        <Save size={14} />
                                        <span>Save Current Values</span>
                                    </button>
                                    <button
                                        onclick={() => {
                                            onReset();
                                            isPresetDropdownOpen = false;
                                        }}
                                        class="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                                    >
                                        <RotateCcw size={14} />
                                        <span>Reset to Defaults</span>
                                    </button>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        {#if endpoint?.description}
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {endpoint.description}
            </p>
        {/if}

        <!-- URL & Domain Row -->
        <div class="flex flex-wrap items-center gap-4">
            <!-- Line 1: Basic Info -->

            {#if availableDomains.length > 0}
                <select
                    bind:value={selectedDomainPrefix}
                    class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/30"
                >
                    {#each availableDomains as domain}
                        <option value={domain.value}>{domain.label}</option>
                    {/each}
                </select>
            {/if}

            <div
                class="flex items-center gap-1.5 px-2 py-1.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/30"
            >
                <span class="text-[10px] uppercase font-bold opacity-70"
                    >Site</span
                >
                <span class="text-xs font-semibold"
                    >{endpoint?.scope?.site}</span
                >
            </div>

            <div class="w-px h-3 bg-slate-300 dark:bg-slate-700 mx-1"></div>

            <div class="flex items-center gap-1.5">
                <span class="text-slate-500 dark:text-slate-400 text-xs"
                    >Type</span
                >
                <span
                    class="px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                >
                    {endpoint?.requestType}
                </span>
            </div>

            <!-- Line 2: Advanced Info -->
            {#if endpoint?.config?.contentType || endpoint?.config?.charset}
                {#if endpoint?.config?.contentType}
                    <div class="flex items-center gap-1.5">
                        <span
                            class="text-slate-500 dark:text-slate-400 text-xs text-nowrap"
                            >Content-Type</span
                        >
                        <span
                            class="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-nowrap"
                        >
                            {endpoint.config.contentType}
                        </span>
                    </div>
                {/if}

                {#if endpoint?.config?.charset}
                    <div class="flex items-center gap-1.5">
                        <span
                            class="text-slate-500 dark:text-slate-400 text-xs text-nowrap"
                            >Charset</span
                        >
                        <span
                            class="px-1.5 py-0.5 rounded text-xs font-semibold bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-nowrap"
                        >
                            {endpoint.config.charset}
                        </span>
                    </div>
                {/if}
            {/if}

            <div
                class="px-3 py-2 bg-white dark:bg-slate-950/50 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-600 dark:text-slate-400 break-all w-full flex flex-wrap items-center gap-1"
            >
                {#if selectedDomainPrefix}
                    <span class="text-slate-400 select-none"
                        >{selectedDomainPrefix}</span
                    >
                {/if}
                <span
                    class="text-indigo-500/80 dark:text-indigo-400/80 select-none"
                    >/{endpoint?.scope?.site}</span
                >
                <span>{endpoint?.uri}</span>
            </div>
        </div>
    </div>
</div>

<!-- SAVE PRESET DIALOG OVERLAY -->
{#if showSavePresetDialog}
    <div
        class="absolute inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/50 backdrop-blur-sm p-4"
        transition:fade={{ duration: 150 }}
    >
        <div
            class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 w-full max-w-sm"
            transition:fade={{ duration: 200 }}
        >
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Save Preset
            </h3>
            <input
                type="text"
                bind:value={newPresetName}
                placeholder="Enter preset name..."
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white mb-4 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
            <div class="flex justify-end gap-2">
                <button
                    onclick={() => (showSavePresetDialog = false)}
                    class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >Cancel</button
                >
                <button
                    onclick={handleSave}
                    class="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
                    >Save</button
                >
            </div>
        </div>
    </div>
{/if}
