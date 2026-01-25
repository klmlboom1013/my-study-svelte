<script lang="ts">
    import DropdownInput from "$lib/components/ui/DropdownInput.svelte";
    import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
    import {
        SERVER_TYPES,
        SERVICE_OPTIONS,
        SERVICE_SITE_MAPPING,
        SITE_MERCHANT_ID_MAPPING,
        type ServerType,
        type ServiceType,
    } from "$lib/constants/wpayServerType";

    let {
        service = $bindable(),
        server = $bindable(),
        site = $bindable(),
        mid = $bindable(),
        isConfigVisible = $bindable(),
        serverRadioOptions,
        prodDomainRadioOptions,
        onServerClick,
    } = $props();

    const serviceOptions = SERVICE_OPTIONS;

    let siteOptions = $derived(
        (service && SERVICE_SITE_MAPPING[service as ServiceType]) || [],
    );
    let merchantIdOptions = $derived(
        (site &&
            SITE_MERCHANT_ID_MAPPING[
                site as keyof typeof SITE_MERCHANT_ID_MAPPING
            ]) ||
            [],
    );

    $effect(() => {
        if (!siteOptions.includes(site as any)) site = "";
    });

    $effect(() => {
        if (!merchantIdOptions.includes(mid as any)) mid = "";
    });
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between mb-4">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">
            WPAY Configuration
        </h3>
        <button
            onclick={() => (isConfigVisible = !isConfigVisible)}
            class="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
        >
            {isConfigVisible ? "Hide advanced" : "Show advanced"}
        </button>
    </div>

    {#if isConfigVisible}
        <div
            class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800"
        >
            <div class="space-y-4">
                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-slate-500 ml-1"
                        >WPAY Service</label
                    >
                    <DropdownInput
                        options={[...serviceOptions]}
                        bind:value={service}
                        placeholder="Select Service"
                    />
                </div>
                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-slate-500 ml-1"
                        >WPAY Site</label
                    >
                    <DropdownInput
                        options={[...siteOptions]}
                        bind:value={site}
                        placeholder="Select Site"
                        disabled={!service}
                    />
                </div>
            </div>
            <div class="space-y-4">
                <div class="space-y-1.5">
                    <label class="text-xs font-bold text-slate-500 ml-1"
                        >Merchant ID</label
                    >
                    <DropdownInput
                        options={[...merchantIdOptions]}
                        bind:value={mid}
                        placeholder="Select MID"
                        disabled={!site}
                    />
                </div>
            </div>
        </div>
    {/if}

    <div class="flex flex-col gap-2">
        <label class="text-xs font-bold text-slate-500 ml-1">Environment</label>
        <RadioGroup
            options={serverRadioOptions}
            bind:selected={server}
            groupName="server"
            onOptionClick={onServerClick}
        />
    </div>
</div>
