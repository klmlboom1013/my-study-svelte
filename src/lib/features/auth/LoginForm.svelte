<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import DropdownInput from "$lib/components/ui/DropdownInput.svelte";
    import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import {
        SERVICE_OPTIONS,
        SERVICE_SITE_MAPPING,
        SITE_CHANNEL_MAPPING,
        SERVER_TYPES,
        PROD_SERVER_DOMAINS,
        type ServerType,
        type ServiceType,
    } from "$lib/utils/config/wpayServerConfig";

    // Options
    const serviceOptions = [...SERVICE_OPTIONS];
    const serverOptions = Object.values(SERVER_TYPES);
    const prodServerOptions = Object.values(PROD_SERVER_DOMAINS);

    // State
    let service = $state("");
    // @ts-ignore
    let serverType = $state<ServerType>("");
    let prodServer = $state("");
    let loginSite = $state("");
    let channel = $state("");

    // Reactive Options
    let siteOptions = $derived(
        (service && SERVICE_SITE_MAPPING[service as ServiceType]) || [],
    );

    let channelOptions = $derived(
        (loginSite &&
            SITE_CHANNEL_MAPPING[
                loginSite as keyof typeof SITE_CHANNEL_MAPPING
            ]) ||
            [],
    );

    let loginId = $state("");
    let loginIdPlaceholder = $state("wpayTestUser01");

    let phone = $state("");
    let rememberMe = $state(false);

    let showProdModal = $state(false);
    let showMissingFields = $state(false);

    // Watch for Server Type click
    function handleServerClick(value: string) {
        if (value === SERVER_TYPES.PROD) {
            showProdModal = true;
        } else {
            prodServer = "";
        }
    }

    // Reactive Server Options with Labels
    let serverOptionsWithLabels = $derived(
        serverOptions.map((type) => {
            if (type === SERVER_TYPES.PROD) {
                const label = prodServer
                    ? `${type} (${prodServer})`
                    : `${type}`;
                return { value: type, label };
            }
            return type;
        }),
    );

    // Reset child selections when parent changes
    $effect(() => {
        // When service changes, if current site is not in new options, clear it
        if (!siteOptions.includes(loginSite as any)) {
            loginSite = "";
        }
    });

    $effect(() => {
        // When site changes, if current channel is not in new options, clear it
        if (!channelOptions.includes(channel as any)) {
            channel = "";
        }
    });

    // Load from LocalStorage
    onMount(() => {
        const saved = localStorage.getItem("loginSettings");
        if (saved) {
            const data = JSON.parse(saved);
            service = data.service ?? "";
            serverType = data.serverType ?? "";
            prodServer = data.prodServer ?? "";
            loginSite = data.loginSite ?? "";
            channel = data.channel ?? "";
            loginId = data.loginId ?? "";
            phone = data.phone ?? "";
            // If we have saved data, it means rememberMe was true
            rememberMe = true;
        }
    });

    // Phone Input Handler
    function handlePhoneInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const clean = target.value.replace(/[^0-9]/g, "");
        phone = clean;
        target.value = clean;
    }

    // Login Handler
    async function handleLogin() {
        if (!isValid) return;

        // Set default Member ID if empty
        if (!loginId) {
            loginId = "wpayTestUser01";
        }

        // Save if Remember Me
        if (rememberMe) {
            const settings = {
                service,
                serverType,
                prodServer,
                loginSite,
                channel,
                loginId,
                phone,
            };
            localStorage.setItem("loginSettings", JSON.stringify(settings));
        } else {
            localStorage.removeItem("loginSettings");
        }

        // Navigate
        goto("/");
    }

    // Validation
    let isValid = $derived(
        !!service &&
            !!serverType &&
            (serverType !== SERVER_TYPES.PROD || !!prodServer) &&
            !!loginSite &&
            !!channel,
    );
</script>

<div class="space-y-6">
    <!-- Service Selection -->
    <div>
        <label
            for="service-select"
            class="block text-sm font-medium text-gray-700 mb-2">Service</label
        >
        <DropdownInput
            id="service-select"
            options={serviceOptions}
            bind:value={service}
            placeholder="선택해 주세요"
            isError={showMissingFields && !service}
        />
    </div>

    <!-- Server Selection -->
    <div>
        <span class="block text-sm font-medium text-gray-700 mb-2">Server</span>
        <!-- Custom wrapper for validation styles -->
        <div
            class={`border-2 rounded-md py-2 px-3 transition-colors ${showMissingFields && !serverType ? "border-red-500" : "border-transparent"}`}
        >
            <RadioGroup
                options={serverOptionsWithLabels}
                groupName="serverType"
                bind:selected={serverType}
                onOptionClick={handleServerClick}
            />
        </div>
    </div>

    <!-- Login Site -->
    <div>
        <label
            for="login-site"
            class="block text-sm font-medium text-gray-700 mb-2">Site</label
        >
        <DropdownInput
            id="login-site"
            options={siteOptions}
            bind:value={loginSite}
            placeholder="선택해 주세요"
            isError={showMissingFields && !loginSite}
        />
    </div>

    <!-- Channel -->
    <div>
        <label
            for="channel-select"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Merchant ID</label
        >
        <DropdownInput
            id="channel-select"
            options={channelOptions}
            bind:value={channel}
            placeholder="선택해 주세요"
            isError={showMissingFields && !channel}
        />
    </div>

    <!-- Login ID -->
    <div>
        <label
            for="login-id"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Member ID</label
        >
        <input
            id="login-id"
            type="text"
            bind:value={loginId}
            placeholder={loginIdPlaceholder}
            onfocus={() => (loginIdPlaceholder = "")}
            onblur={() =>
                (loginIdPlaceholder = !loginId ? "wpayTestUser01" : "")}
            class="w-full border-2 border-[oklch(0.36_0.11_265.06)] rounded-md py-2 px-3 font-medium placeholder-[oklch(0.75_0.04_262.99)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.36_0.11_265.06)]/20"
            style="color: oklch(0.36 0.11 265.06);"
        />
    </div>

    <!-- Phone -->
    <div>
        <label
            for="phone-number"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Cell Phone Number</label
        >
        <input
            id="phone-number"
            type="text"
            value={phone}
            oninput={handlePhoneInput}
            class="w-full border-2 border-[oklch(0.36_0.11_265.06)] rounded-md py-2 px-3 font-medium placeholder-[oklch(0.75_0.04_262.99)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.36_0.11_265.06)]/20"
            style="color: oklch(0.36 0.11 265.06);"
            placeholder="숫자만 입력해 주세요"
        />
    </div>

    <!-- Remember Me -->
    <div class="flex items-center">
        <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            bind:checked={rememberMe}
            class="h-4 w-4 text-[oklch(0.36_0.11_265.06)] focus:ring-[oklch(0.36_0.11_265.06)] border-gray-300 rounded cursor-pointer"
        />
        <label
            for="remember-me"
            class="ml-2 block text-sm text-gray-900 cursor-pointer"
        >
            Remember Me
        </label>
    </div>

    <!-- Login Button -->
    <div
        class="w-full"
        role="none"
        onmouseenter={() => (showMissingFields = true)}
        onmouseleave={() => (showMissingFields = false)}
        ontouchstart={() => (showMissingFields = true)}
        ontouchend={() => (showMissingFields = false)}
    >
        <button
            onclick={handleLogin}
            disabled={!isValid}
            class={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
        ${isValid ? "bg-[oklch(0.36_0.11_265.06)] hover:bg-[oklch(0.49_0.23_262.62)] focus:ring-2 focus:ring-offset-2 focus:ring-[oklch(0.36_0.11_265.06)]" : "bg-[oklch(0.83_0_0)] cursor-not-allowed"}
        transition-colors`}
        >
            {isValid ? "다음" : "다음"}
        </button>
    </div>
</div>

<!-- PROD Server Modal -->
<Modal bind:isOpen={showProdModal} title="PROD 서버 선택">
    <div class="flex flex-col gap-4">
        <p class="text-sm text-gray-600 mb-2">
            접속할 PROD 서버를 선택해주세요.
        </p>
        <RadioGroup
            options={prodServerOptions}
            groupName="prodServer"
            bind:selected={prodServer}
            direction="column"
        />
        <div class="mt-6 flex justify-end">
            <button
                onclick={() => (showProdModal = false)}
                class="px-4 py-2 rounded-md text-[oklch(1_0_0)] bg-[oklch(0.36_0.11_265.06)] hover:bg-[oklch(0.49_0.23_262.62)] transition-colors"
            >
                확인
            </button>
        </div>
    </div>
</Modal>
