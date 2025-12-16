<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import DropdownInput from "$lib/components/DropdownInput.svelte";
    import RadioGroup from "$lib/components/RadioGroup.svelte";
    import Modal from "$lib/components/Modal.svelte";

    // Options
    const serviceOptions = [
        "wpaystd-old",
        "wpaystd2",
        "wpaypro",
        "wpayplus",
        "wpaycst",
    ];
    const serverOptions = ["DEV", "STG", "PROD"];
    const prodServerOptions = ["GLB Domain", "KS Domain", "FC Domain"];
    // Placeholder options for others as they weren't specified
    const siteOptions = ["stdwpay", "stdwpay-test"];
    const channelOptions = ["INIwpayT03", "INIwpayT04"];

    // State
    let service = $state("wpaystd2");
    let serverType = $state("DEV");
    let prodServer = $state("GLB Domain");
    let loginSite = $state("stdwpay");
    let channel = $state("INIwpayT03");

    let loginId = $state("wpayTestUser01");
    let loginIdPlaceholder = $state("wpayTestUser01");

    let phone = $state("");
    let rememberMe = $state(false);

    let showProdModal = $state(false);

    // Watch for Server Type change to PROD
    function handleServerChange() {
        if (serverType === "PROD") {
            showProdModal = true;
        }
    }

    // Load from LocalStorage
    onMount(() => {
        const saved = localStorage.getItem("loginSettings");
        if (saved) {
            const data = JSON.parse(saved);
            service = data.service ?? "wpaystd2";
            serverType = data.serverType ?? "DEV";
            prodServer = data.prodServer ?? "GLB Domain";
            loginSite = data.loginSite ?? "stdwpay";
            channel = data.channel ?? "INIwpayT03";
            loginId = data.loginId ?? "wpayTestUser01";
            phone = data.phone ?? "";
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
    function handleLogin() {
        if (!isValid) return;

        // Default ID logic
        if (!loginId.trim()) {
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
        !!service && !!serverType && !!loginSite && !!channel,
    );
</script>

<div
    class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
>
    <div
        class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100"
    >
        <div class="text-center">
            <h2 class="mt-6 text-3xl font-extrabold text-gray-900">로그인</h2>
        </div>

        <div class="space-y-6">
            <!-- Service Selection -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                    >서비스 선택</label
                >
                <DropdownInput
                    options={serviceOptions}
                    bind:value={service}
                    placeholder="서비스를 선택하거나 입력하세요"
                />
            </div>

            <!-- Server Selection -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                    >서버 선택</label
                >
                <!-- Custom wrapper to detect change for Modal -->
                <div onclick={handleServerChange} role="none">
                    <RadioGroup
                        options={serverOptions}
                        groupName="serverType"
                        bind:selected={serverType}
                    />
                </div>

                {#if serverType === "PROD"}
                    <div
                        class="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded"
                    >
                        선택된 서버: <strong>{prodServer}</strong>
                        <button
                            type="button"
                            class="ml-2 underline text-xs"
                            onclick={() => (showProdModal = true)}>변경</button
                        >
                    </div>
                {/if}
            </div>

            <!-- Login Site -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                    >로그인 사이트</label
                >
                <DropdownInput
                    options={siteOptions}
                    bind:value={loginSite}
                    placeholder="사이트를 선택하거나 입력하세요"
                />
            </div>

            <!-- Channel -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                    >채널 선택</label
                >
                <DropdownInput
                    options={channelOptions}
                    bind:value={channel}
                    placeholder="채널을 선택하거나 입력하세요"
                />
            </div>

            <!-- Login ID -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                    >로그인 ID</label
                >
                <input
                    type="text"
                    bind:value={loginId}
                    placeholder={loginIdPlaceholder}
                    onfocus={() => (loginIdPlaceholder = "")}
                    onblur={() =>
                        (loginIdPlaceholder = !loginId ? "wpayTestUser01" : "")}
                    class="w-full border-2 border-blue-500 rounded-md py-2 px-3 text-blue-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
            </div>

            <!-- Phone -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                    >휴대폰 번호</label
                >
                <input
                    type="text"
                    value={phone}
                    oninput={handlePhoneInput}
                    class="w-full border-2 border-blue-500 rounded-md py-2 px-3 text-blue-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
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
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label
                    for="remember-me"
                    class="ml-2 block text-sm text-gray-900 cursor-pointer"
                >
                    Remember me
                </label>
            </div>

            <!-- Login Button -->
            <div>
                <button
                    onclick={handleLogin}
                    disabled={!isValid}
                    class={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                ${isValid ? "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" : "bg-gray-400 cursor-not-allowed"}
                transition-colors`}
                >
                    {isValid ? "로그인" : "로그인 (disabled)"}
                </button>
            </div>
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
                    class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    확인
                </button>
            </div>
        </div>
    </Modal>
</div>
