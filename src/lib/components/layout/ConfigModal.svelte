<script lang="ts">
    import Modal from "$lib/components/ui/Modal.svelte";
    import DropdownInput from "$lib/components/ui/DropdownInput.svelte";
    import {
        SERVICE_OPTIONS,
        MERCHANT_ID_OPTIONS,
        SERVICE_SITE_MAPPING,
        SITE_MERCHANT_ID_MAPPING,
        type ServiceType,
        type SiteType,
        type MerchantIdType,
    } from "$lib/constants/wpayServerType";

    interface Props {
        isOpen: boolean;
        onClose: () => void;
        onSave: () => void;
    }

    let { isOpen = $bindable(), onClose, onSave }: Props = $props();

    // State
    let service = $state<ServiceType>("wpaystd2");
    let site = $state<SiteType>("stdwpay");
    let mid = $state<MerchantIdType>("INIwpayT03");

    // Load initial data when modal opens
    $effect(() => {
        if (isOpen) {
            loadCurrentConfig();
        }
    });

    function loadCurrentConfig() {
        try {
            const stored = localStorage.getItem("sign-in-page");
            if (stored) {
                const data = JSON.parse(stored);
                service = (data.service as ServiceType) || "wpaystd2";
                site = (data.site as SiteType) || "stdwpay";
                mid = (data.mid as MerchantIdType) || "INIwpayT03";
            }
        } catch (e) {
            console.error("Failed to load config", e);
        }
    }

    // Reactive Options
    let siteOptions = $derived(
        (service && SERVICE_SITE_MAPPING[service]) || [],
    );

    let merchantIdOptions = $derived(
        (site &&
            SITE_MERCHANT_ID_MAPPING[
                site as keyof typeof SITE_MERCHANT_ID_MAPPING
            ]) ||
            [],
    );

    // Watchers for dependencies
    $effect(() => {
        // Reset site if not valid for new service (unless it's just loading)
        if (service && !siteOptions.includes(site)) {
            site = siteOptions[0];
        }
    });

    $effect(() => {
        // Reset mid if not valid for new site
        if (site && !merchantIdOptions.includes(mid)) {
            mid = merchantIdOptions[0] || "";
        }
    });

    function handleSave() {
        try {
            const stored = localStorage.getItem("sign-in-page");
            let data = stored ? JSON.parse(stored) : {};

            data = {
                ...data,
                service,
                site,
                mid,
            };

            localStorage.setItem("sign-in-page", JSON.stringify(data));
            onSave();
            isOpen = false;
        } catch (e) {
            console.error("Failed to save config", e);
        }
    }
</script>

<Modal bind:isOpen title="Environment Configuration" {onClose} width="max-w-md">
    <div class="flex flex-col gap-6">
        <div class="space-y-1">
            <label
                class="text-sm font-medium text-slate-700 dark:text-slate-300"
                for="conf-service"
            >
                Service
            </label>
            <DropdownInput
                id="conf-service"
                options={[...SERVICE_OPTIONS]}
                bind:value={service}
                placeholder="Select Service"
            />
        </div>

        <div class="space-y-1">
            <label
                class="text-sm font-medium text-slate-700 dark:text-slate-300"
                for="conf-site"
            >
                Site
            </label>
            <DropdownInput
                id="conf-site"
                options={siteOptions}
                bind:value={site}
                placeholder="Select Site"
                disabled={!service}
            />
        </div>

        <div class="space-y-1">
            <label
                class="text-sm font-medium text-slate-700 dark:text-slate-300"
                for="conf-mid"
            >
                Merchant ID
            </label>
            <DropdownInput
                id="conf-mid"
                options={[...merchantIdOptions]}
                bind:value={mid}
                placeholder="Select Merchant ID"
                disabled={!site}
            />
        </div>

        <div class="flex justify-end gap-3 mt-4">
            <button
                class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                onclick={() => {
                    isOpen = false;
                    onClose();
                }}
            >
                Cancel
            </button>
            <button
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                onclick={handleSave}
            >
                Save Changes
            </button>
        </div>
    </div>
</Modal>
