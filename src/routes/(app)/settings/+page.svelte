<script lang="ts">
    import { settingsStore } from "$lib/stores/settingsStore";
    import { profileStore } from "$lib/stores/profileStore";
    import { SERVICE_OPTIONS } from "$lib/constants/wpayServerType";
    import { onMount } from "svelte";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";

    let activeCategory = "endpoint"; // 'endpoint', 'interface'
    let activeSubTab = "global"; // for endpoint: 'global', 'options', 'mid'

    // Form states
    let globalParam = { application: "", key: "", value: "" };
    let selectedService = "";
    let paramOption = { name: "", code: "", value: "" };
    let midContext = { mid: "", encKey: "", encIV: "", hashKey: "" };

    // Temporary state for adding options to a new parameter option set
    let currentOptions: { code: string; value: string }[] = [];

    function addGlobalParam() {
        if (globalParam.application && globalParam.key && globalParam.value) {
            const finalApplication =
                globalParam.application.toUpperCase() === "WPAY" &&
                selectedService
                    ? selectedService
                    : globalParam.application;

            settingsStore.addGlobalParameter({
                ...globalParam,
                application: finalApplication,
            });
            globalParam = { application: "", key: "", value: "" };
            selectedService = "";
        }
    }

    function addOptionToCurrent() {
        if (paramOption.code && paramOption.value) {
            currentOptions = [
                ...currentOptions,
                { code: paramOption.code, value: paramOption.value },
            ];
            paramOption.code = "";
            paramOption.value = "";
        }
    }

    function saveParameterOption() {
        if (paramOption.name && currentOptions.length > 0) {
            settingsStore.addParameterOption({
                name: paramOption.name,
                options: currentOptions,
            });
            paramOption = { name: "", code: "", value: "" };
            currentOptions = [];
        }
    }

    function addMidContext() {
        if (
            midContext.mid &&
            midContext.encKey &&
            midContext.encIV &&
            midContext.hashKey
        ) {
            settingsStore.addMidContext(midContext);
            midContext = { mid: "", encKey: "", encIV: "", hashKey: "" };
        }
    }

    function updateInterface(
        section: "sidebar" | "dashboard",
        key: string,
        value: boolean,
    ) {
        settingsStore.update((current) => {
            const newInterface = { ...current.interface };
            // @ts-ignore - dynamic key access
            newInterface[section] = { ...newInterface[section], [key]: value };
            return { ...current, interface: newInterface };
        });
    }

    const categories = [
        { id: "endpoint", label: "Endpoint Config", icon: "tune" },
        { id: "interface", label: "Interface", icon: "web_asset" },
    ];
</script>

<div class="max-w-screen-2xl mx-auto py-8 px-4">
    <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Settings" }]}
    />

    <div class="flex items-end justify-between mb-8">
        <div>
            <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Settings
            </h1>
            <p class="text-slate-500 dark:text-slate-400">
                Manage global configurations for endpoints and user interface.
            </p>
        </div>
    </div>

    <div class="flex flex-col md:flex-row gap-8">
        <!-- Sidebar Navigation -->
        <aside class="w-full md:w-64 flex-shrink-0">
            <div
                class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark overflow-hidden"
            >
                <div
                    class="p-4 bg-slate-50 dark:bg-background-dark border-b border-slate-200 dark:border-border-dark"
                >
                    <h2
                        class="font-semibold text-slate-700 dark:text-slate-200"
                    >
                        Categories
                    </h2>
                </div>
                <nav class="flex flex-col p-2 space-y-1">
                    {#each categories as category}
                        <button
                            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors {activeCategory ===
                            category.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-primary'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}"
                            onclick={() => (activeCategory = category.id)}
                        >
                            <span class="material-symbols-outlined text-[20px]"
                                >{category.icon}</span
                            >
                            {category.label}
                        </button>
                    {/each}
                </nav>
            </div>
        </aside>

        <!-- Main Content Area -->
        <main
            class="flex-1 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark min-h-[500px] shadow-sm flex flex-col"
        >
            <!-- Endpoint Configuration Header / Tabs -->
            {#if activeCategory === "endpoint"}
                <div class="border-b border-slate-200 dark:border-border-dark">
                    <div class="flex overflow-x-auto">
                        <button
                            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeSubTab ===
                            'global'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                            onclick={() => (activeSubTab = "global")}
                        >
                            Global Parameters
                        </button>
                        <button
                            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeSubTab ===
                            'options'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                            onclick={() => (activeSubTab = "options")}
                        >
                            Parameter Options
                        </button>
                        <button
                            class="px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap {activeSubTab ===
                            'mid'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                            onclick={() => (activeSubTab = "mid")}
                        >
                            MID Context
                        </button>
                    </div>
                </div>

                <!-- Endpoint Content -->
                <div class="p-6">
                    {#if activeSubTab === "global"}
                        <!-- Global Parameters Content -->
                        <div
                            class="mb-8 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark"
                        >
                            <h3
                                class="text-base font-bold text-slate-800 dark:text-white mb-4"
                            >
                                Add Global Parameter
                            </h3>
                            <div class="flex flex-col gap-4">
                                <div
                                    class="flex flex-col md:flex-row gap-4 items-end"
                                >
                                    <label
                                        class="flex flex-col gap-1 w-full md:w-1/3"
                                    >
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Application</span
                                        >
                                        <div class="flex gap-2">
                                            <select
                                                class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
                                                bind:value={
                                                    globalParam.application
                                                }
                                                onchange={() =>
                                                    (selectedService = "")}
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    selected
                                                    >Select Application</option
                                                >
                                                {#each $profileStore.myApplications as app}
                                                    <option value={app.appName}
                                                        >{app.appName}</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>
                                    </label>
                                    {#if globalParam.application?.toUpperCase() === "WPAY"}
                                        <div class="w-full md:w-1/3">
                                            <select
                                                class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all w-full"
                                                bind:value={selectedService}
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    selected
                                                    >Select Service</option
                                                >
                                                <option value="WPAY">All</option
                                                >
                                                {#each SERVICE_OPTIONS as service}
                                                    <option value={service}
                                                        >{service}</option
                                                    >
                                                {/each}
                                            </select>
                                        </div>
                                    {/if}
                                </div>
                                <div
                                    class="flex flex-col md:flex-row gap-4 items-end"
                                >
                                    <label class="flex flex-col gap-1 flex-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Key</span
                                        >
                                        <input
                                            type="text"
                                            placeholder="Parameter Key"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                            bind:value={globalParam.key}
                                        />
                                    </label>
                                    <label class="flex flex-col gap-1 flex-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Value</span
                                        >
                                        <input
                                            type="text"
                                            placeholder="Parameter Value"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                            bind:value={globalParam.value}
                                        />
                                    </label>
                                    <div
                                        class="flex items-end w-full md:w-auto"
                                    >
                                        <button
                                            class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto whitespace-nowrap"
                                            onclick={addGlobalParam}>Add</button
                                        >
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="overflow-x-auto rounded-lg border border-slate-200 dark:border-border-dark"
                        >
                            <table class="w-full text-sm text-left">
                                <thead
                                    class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-background-dark border-b border-slate-200 dark:border-border-dark"
                                >
                                    <tr>
                                        <th class="px-6 py-4 font-semibold"
                                            >Application</th
                                        >
                                        <th class="px-6 py-4 font-semibold"
                                            >Key</th
                                        >
                                        <th class="px-6 py-4 font-semibold"
                                            >Value</th
                                        >
                                        <th
                                            class="px-6 py-4 font-semibold w-[100px] text-right"
                                            >Action</th
                                        >
                                    </tr>
                                </thead>
                                <tbody
                                    class="divide-y divide-slate-100 dark:divide-slate-800"
                                >
                                    {#each $settingsStore.globalParameters as param}
                                        <tr
                                            class="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <td class="px-6 py-4 font-medium"
                                                ><span
                                                    class="px-2 py-1 rounded text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                                    >{param.application}</span
                                                ></td
                                            >
                                            <td
                                                class="px-6 py-4 font-medium text-slate-700 dark:text-slate-300"
                                                >{param.key}</td
                                            >
                                            <td
                                                class="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs"
                                                >{param.value}</td
                                            >
                                            <td class="px-6 py-4 text-right">
                                                <button
                                                    class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                    onclick={() =>
                                                        settingsStore.removeGlobalParameter(
                                                            param.id,
                                                        )}
                                                    ><span
                                                        class="material-symbols-outlined text-[18px]"
                                                        >delete</span
                                                    ></button
                                                >
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {:else if activeSubTab === "options"}
                        <!-- Parameter Options Content -->
                        <div
                            class="mb-8 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark"
                        >
                            <h3
                                class="text-base font-bold text-slate-800 dark:text-white mb-4"
                            >
                                Create Option Set
                            </h3>
                            <div class="flex flex-col gap-4">
                                <label class="flex flex-col gap-1">
                                    <span
                                        class="text-xs font-semibold text-slate-500 uppercase"
                                        >Parameter Name</span
                                    >
                                    <input
                                        type="text"
                                        placeholder="e.g. payMethod"
                                        class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                        bind:value={paramOption.name}
                                    />
                                </label>
                                <div
                                    class="p-4 border border-slate-200 dark:border-border-dark rounded-lg bg-white dark:bg-card-dark"
                                >
                                    <div class="flex gap-3 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Code"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all flex-1"
                                            bind:value={paramOption.code}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Value"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all flex-1"
                                            bind:value={paramOption.value}
                                        />
                                        <button
                                            class="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-slate-600"
                                            onclick={addOptionToCurrent}
                                            >Add Value</button
                                        >
                                    </div>
                                    <div class="flex flex-wrap gap-2">
                                        {#each currentOptions as opt, i}
                                            <div
                                                class="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-blue-100 dark:border-blue-800"
                                            >
                                                <span class="font-bold"
                                                    >{opt.code}</span
                                                >: {opt.value}
                                                <button
                                                    class="ml-1 hover:text-red-500"
                                                    onclick={() =>
                                                        (currentOptions =
                                                            currentOptions.filter(
                                                                (_, idx) =>
                                                                    idx !== i,
                                                            ))}>×</button
                                                >
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                                <div class="flex justify-end">
                                    <button
                                        class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!paramOption.name ||
                                            currentOptions.length === 0}
                                        onclick={saveParameterOption}
                                        >Save Option Set</button
                                    >
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {#each $settingsStore.parameterOptions as opt}
                                <div
                                    class="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-5 hover:shadow-md transition-shadow group relative"
                                >
                                    <div
                                        class="flex justify-between items-center mb-3"
                                    >
                                        <h4 class="font-bold">{opt.name}</h4>
                                        <button
                                            class="p-1 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            onclick={() =>
                                                settingsStore.removeParameterOption(
                                                    opt.id,
                                                )}
                                            ><span
                                                class="material-symbols-outlined text-[18px]"
                                                >delete</span
                                            ></button
                                        >
                                    </div>
                                    <div class="space-y-1">
                                        {#each opt.options as val}
                                            <div
                                                class="flex justify-between text-sm"
                                            >
                                                <span
                                                    class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded"
                                                    >{val.code}</span
                                                ><span class="text-slate-600"
                                                    >{val.value}</span
                                                >
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else if activeSubTab === "mid"}
                        <!-- MID Context Content -->
                        <div
                            class="mb-8 bg-slate-50 dark:bg-background-dark p-6 rounded-xl border border-slate-200 dark:border-border-dark"
                        >
                            <h3
                                class="text-base font-bold text-slate-800 dark:text-white mb-4"
                            >
                                Add MID Context
                            </h3>
                            <div class="grid grid-cols-1 gap-4">
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <label class="flex flex-col gap-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >MID</span
                                        ><input
                                            type="text"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                            bind:value={midContext.mid}
                                        />
                                    </label>
                                    <label class="flex flex-col gap-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Hash Key</span
                                        ><input
                                            type="text"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                            bind:value={midContext.hashKey}
                                        />
                                    </label>
                                </div>
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    <label class="flex flex-col gap-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Enc Key</span
                                        ><input
                                            type="text"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                            bind:value={midContext.encKey}
                                        />
                                    </label>
                                    <label class="flex flex-col gap-1">
                                        <span
                                            class="text-xs font-semibold text-slate-500 uppercase"
                                            >Enc IV</span
                                        ><input
                                            type="text"
                                            class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                            bind:value={midContext.encIV}
                                        />
                                    </label>
                                </div>
                                <div class="flex justify-end">
                                    <button
                                        class="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        onclick={addMidContext}
                                        >Add Context</button
                                    >
                                </div>
                            </div>
                        </div>
                        <div
                            class="overflow-x-auto rounded-lg border border-slate-200 dark:border-border-dark"
                        >
                            <table class="w-full text-sm text-left">
                                <thead
                                    class="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-background-dark border-b border-slate-200 dark:border-border-dark"
                                >
                                    <tr
                                        ><th class="px-6 py-4">MID</th><th
                                            class="px-6 py-4">Keys</th
                                        ><th class="px-6 py-4 text-right"
                                            >Action</th
                                        ></tr
                                    >
                                </thead>
                                <tbody
                                    class="divide-y divide-slate-100 dark:divide-slate-800"
                                >
                                    {#each $settingsStore.midContexts as ctx}
                                        <tr
                                            class="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <td
                                                class="px-6 py-4 font-mono font-medium"
                                                >{ctx.mid}</td
                                            >
                                            <td class="px-6 py-4">
                                                <div
                                                    class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs"
                                                >
                                                    <span class="text-slate-500"
                                                        >Hash:</span
                                                    ><span
                                                        class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded"
                                                        >{ctx.hashKey}</span
                                                    >
                                                    <span class="text-slate-500"
                                                        >Enc:</span
                                                    ><span
                                                        class="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded"
                                                        >{ctx.encKey}</span
                                                    >
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-right"
                                                ><button
                                                    class="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                    onclick={() =>
                                                        settingsStore.removeMidContext(
                                                            ctx.id,
                                                        )}
                                                    ><span
                                                        class="material-symbols-outlined text-[18px]"
                                                        >delete</span
                                                    ></button
                                                ></td
                                            >
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {/if}
                </div>
            {:else if activeCategory === "interface"}
                <!-- Interface Settings Content -->
                <div class="p-6">
                    <h2
                        class="text-xl font-bold text-slate-900 dark:text-white mb-6"
                    >
                        Interface Settings
                    </h2>

                    <!-- Sidebar Config -->
                    <section class="mb-10">
                        <h3
                            class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"
                        >
                            <span
                                class="material-symbols-outlined text-slate-400"
                                >dock_to_right</span
                            >
                            Sidebar Menu
                        </h3>
                        <div
                            class="bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-200 dark:border-border-dark p-1"
                        >
                            <div
                                class="grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-800"
                            >
                                {#each Object.entries($settingsStore.interface.sidebar) as [key, enabled]}
                                    <div
                                        class="p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        <div class="flex flex-col">
                                            <span
                                                class="font-medium text-slate-900 dark:text-slate-100 capitalize"
                                                >{key.replace("show", "")}</span
                                            >
                                            <span
                                                class="text-xs text-slate-500 dark:text-slate-400"
                                                >Toggle visibility of {key.replace(
                                                    "show",
                                                    "",
                                                )} menu item.</span
                                            >
                                        </div>
                                        <label
                                            class="relative inline-flex items-center cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                class="sr-only peer"
                                                checked={enabled}
                                                onchange={(e) =>
                                                    updateInterface(
                                                        "sidebar",
                                                        key,
                                                        e.currentTarget.checked,
                                                    )}
                                            />
                                            <div
                                                class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                                            ></div>
                                        </label>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </section>

                    <!-- Dashboard Config -->
                    <section>
                        <h3
                            class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"
                        >
                            <span
                                class="material-symbols-outlined text-slate-400"
                                >dashboard</span
                            >
                            Dashboard Widgets
                        </h3>
                        <div
                            class="bg-slate-50 dark:bg-background-dark rounded-xl border border-slate-200 dark:border-border-dark p-1"
                        >
                            <div
                                class="grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-800"
                            >
                                {#each Object.entries($settingsStore.interface.dashboard) as [key, enabled]}
                                    <div
                                        class="p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    >
                                        <div class="flex flex-col">
                                            <span
                                                class="font-medium text-slate-900 dark:text-slate-100 capitalize"
                                                >{key
                                                    .replace("show", "")
                                                    .replace(/([A-Z])/g, " $1")
                                                    .trim()}</span
                                            >
                                            <span
                                                class="text-xs text-slate-500 dark:text-slate-400"
                                                >Manage display data on
                                                dashboard.</span
                                            >
                                        </div>
                                        <label
                                            class="relative inline-flex items-center cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                class="sr-only peer"
                                                checked={enabled}
                                                onchange={(e) =>
                                                    updateInterface(
                                                        "dashboard",
                                                        key,
                                                        e.currentTarget.checked,
                                                    )}
                                            />
                                            <div
                                                class="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                                            ></div>
                                        </label>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </section>
                </div>
            {/if}
        </main>
    </div>
</div>
