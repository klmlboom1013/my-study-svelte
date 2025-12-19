<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import DropdownInput from "$lib/components/ui/DropdownInput.svelte";
    import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import {
        SERVER_TYPES,
        PROD_SERVER_DOMAINS,
        SERVICE_OPTIONS,
        MERCHANT_ID_OPTIONS,
        SERVICE_SITE_MAPPING,
        SITE_MERCHANT_ID_MAPPING,
        type ServerType,
        type ServiceType,
        type SiteType,
        type MerchantIdType,
    } from "$lib/types/wpayServerType";

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
    let merchantId = $state("");

    // Reactive Options
    let siteOptions = $derived(
        (service && SERVICE_SITE_MAPPING[service as ServiceType]) || [],
    );

    let merchantIdOptions = $derived(
        (loginSite &&
            SITE_MERCHANT_ID_MAPPING[
                loginSite as keyof typeof SITE_MERCHANT_ID_MAPPING
            ]) ||
            [],
    );

    let loginId = $state("");
    let loginIdPlaceholder = $state("wpayTestUser01");

    let phone = $state("");
    let rememberMe = $state(false);

    let showProdModal = $state(false);
    let showMissingFields = $state(false);
    let transitionDuration = $state(200); // Default transition duration

    let touchTimer: ReturnType<typeof setTimeout>;

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
        // When site changes, if current merchantId is not in new options, clear it
        if (!merchantIdOptions.includes(merchantId as any)) {
            merchantId = "";
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
            merchantId = data.merchantId ?? "";
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

    // Wpay Signup Logic
    let isSignupOpen = $state(false);

    function startWpaySignup() {
        isSignupOpen = true;
        // Listen for message
        window.addEventListener("message", handleWpayMessage);
    }

    function handleWpayMessage(event: MessageEvent) {
        // Validation of origin can be added here
        if (event.data && event.data.wpayUserKey) {
            localStorage.setItem("wpayUserKey", event.data.wpayUserKey);
            isSignupOpen = false;
            window.removeEventListener("message", handleWpayMessage);
            goto("/");
        }
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
                merchantId,
                loginId,
                phone,
            };
            localStorage.setItem("loginSettings", JSON.stringify(settings));
        } else {
            localStorage.removeItem("loginSettings");
        }

        // Wpay Signup Check
        const savedWpayKey = localStorage.getItem("wpayUserKey");
        if (!phone || !savedWpayKey) {
            startWpaySignup();
            return;
        }

        // Navigate
        goto("/");
    }

    // Touch Interaction Handler
    function handleTouchStart() {
        if (touchTimer) clearTimeout(touchTimer);
        transitionDuration = 200; // Instant/Quick on start
        showMissingFields = true;
    }

    function handleTouchEnd() {
        if (touchTimer) clearTimeout(touchTimer);
        // Wait 2s, then fade out over 2s
        touchTimer = setTimeout(() => {
            transitionDuration = 2000; // Slow fade
            showMissingFields = false;

            // Reset transition duration after fade completes
            setTimeout(() => {
                transitionDuration = 200;
            }, 2000);
        }, 2000);
    }

    function handleMouseEnter() {
        if (touchTimer) clearTimeout(touchTimer);
        transitionDuration = 200;
        showMissingFields = true;
    }

    function handleMouseLeave() {
        if (touchTimer) clearTimeout(touchTimer);
        transitionDuration = 200;
        showMissingFields = false;
    }

    // Validation
    let isValid = $derived(
        !!service &&
            !!serverType &&
            (serverType !== SERVER_TYPES.PROD || !!prodServer) &&
            !!loginSite &&
            !!merchantId,
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
        <RadioGroup
            options={serverOptionsWithLabels}
            groupName="serverType"
            bind:selected={serverType}
            onOptionClick={handleServerClick}
            isError={showMissingFields && !serverType}
        />
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

    <!-- Merchant ID -->
    <div>
        <label
            for="merchant-id-select"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Merchant ID</label
        >
        <DropdownInput
            id="merchant-id-select"
            options={merchantIdOptions}
            bind:value={merchantId}
            placeholder="선택해 주세요"
            isError={showMissingFields && !merchantId}
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
            class="w-full border-2 border-brand-primary rounded-md py-2 px-3 font-medium placeholder-ui-hint focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            class:text-brand-primary={true}
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
            class="w-full border-2 border-brand-primary rounded-md py-2 px-3 font-medium placeholder-ui-hint focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            class:text-brand-primary={true}
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
            class="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded cursor-pointer"
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
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
        ontouchstart={handleTouchStart}
        ontouchend={handleTouchEnd}
    >
        <button
            onclick={handleLogin}
            disabled={!isValid}
            class={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
        ${isValid ? "bg-brand-primary hover:bg-brand-hover focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary" : "bg-ui-inactive cursor-not-allowed"}
        transition-colors`}
        >
            {isValid ? "다음" : "다음"}
        </button>
    </div>
</div>

<!-- PROD Server Modal -->
<Modal bind:isOpen={showProdModal} title="PROD 서버 선택">
    <div class="flex flex-col gap-4">
        <p class="text-sm text-text-message mb-2">
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
                class="px-4 py-2 rounded-md text-text-white bg-brand-primary hover:bg-brand-hover transition-colors"
            >
                확인
            </button>
        </div>
    </div>
</Modal>

<!-- Wpay Signup Iframe Modal -->
{#if isSignupOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
        <div
            class="bg-white w-full max-w-lg h-[600px] rounded-lg shadow-xl relative overflow-hidden"
        >
            <button
                class="absolute top-2 right-2 p-2 hover:bg-gray-100 rounded-full"
                onclick={() => (isSignupOpen = false)}
            >
                ✕
            </button>
            <iframe src="about:blank" title="Wpay Signup" class="w-full h-full"
            ></iframe>
        </div>
    </div>
{/if}
