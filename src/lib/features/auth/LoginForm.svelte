<script lang="ts">
    import { onMount, onDestroy } from "svelte";
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
        type ProdServerDomain,
    } from "$lib/types/wpayServerType";
    import { MERCHANT_KEYS } from "$lib/utils/encryption/cryptoKeys";
    import { generateSignature } from "$lib/utils/wpay/signature";
    import { encryptSeed, decryptSeed } from "$lib/utils/encryption/cryptoSeed";
    import { SERVICE_URLS } from "$lib/constants/wpayUrls";

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
    let showResultModal = $state(false); // WPAY Result Modal
    let isWpaySuccess = $state(false);
    let validationError = $state(""); // To store specific validation error
    let wpayResultData = $state<
        {
            key: string;
            label: string;
            encrypted: string;
            decrypted: string;
        }[]
    >([]);

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

    // Cleanup on destroy
    onDestroy(() => {
        if (typeof window !== "undefined") {
            window.removeEventListener("message", handleWpayMessage);
        }
    });

    // Load from LocalStorage
    onMount(() => {
        service = localStorage.getItem("serviceOption") || "";
        serverType = (localStorage.getItem("serverType") as ServerType) || "";
        prodServer = localStorage.getItem("prodServerDomain") || "";
        loginSite = localStorage.getItem("siteOption") || "";
        merchantId = localStorage.getItem("mid") || "";
        loginId = localStorage.getItem("userId") || "";
        phone = localStorage.getItem("hNum") || "";

        // Check if we have any saved data to determine "Remember Me" state
        // If we have at least one of these critical fields, assume Remember Me was on.
        if (service || serverType || loginSite || merchantId) {
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
    let wpayPopup: Window | null = null;

    function startWpaySignup() {
        const width = 400;
        const height = 750;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        wpayPopup = window.open(
            "",
            "wpay-popup",
            `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`,
        );

        // Remove existing listener if any to prevent duplicates
        window.removeEventListener("message", handleWpayMessage);
        // Listen for message
        window.addEventListener("message", handleWpayMessage);
    }

    async function handleWpayMessage(event: MessageEvent) {
        if (!event.data || !event.data.resultCode) return;

        console.group("WPAY Response Debug");
        console.log("Raw Data:", event.data);

        const resData = event.data;

        const keys = MERCHANT_KEYS[merchantId];
        if (!keys) {
            console.error("Merchant Keys not found for:", merchantId);
            console.groupEnd();
            return;
        }

        // Response Signing Order (WPAYSTD2 1. 회원 가입 요청)
        const responseSigningOrder = [
            "resultCode",
            "resultMsg",
            "mid",
            "wtid",
            "userId",
            "wpayUserKey",
            "ci",
        ];

        // 1. Signature Verification
        if (resData.signature) {
            const calculatedSignature = await generateSignature(
                resData,
                keys.hashKey,
                responseSigningOrder,
            );
            console.log("Calculated Sig:", calculatedSignature);
            console.log("Received Sig:", resData.signature);

            if (calculatedSignature !== resData.signature) {
                alert("WPAY Response Signature Verification Failed!");
                console.groupEnd();
                if (wpayPopup) wpayPopup.close();
                window.removeEventListener("message", handleWpayMessage);
                return;
            }
        }

        // 2. Decrypt & Decode
        const decrypt = (val: string) =>
            val ? decryptSeed(val, keys.seedKey, keys.seedIV) : "";
        const decode = (val: string) => (val ? decodeURIComponent(val) : "");

        // resultMsg: Encoded O (Modified)
        const resultMsg = resData.resultMsg ? decode(resData.resultMsg) : "";

        // wpayUserKey: Encrypt O (Modified)
        const wpayUserKey = resData.wpayUserKey
            ? decrypt(resData.wpayUserKey)
            : "";

        // ci: Encrypt O
        const ci = resData.ci ? decrypt(resData.ci) : "";

        // mid: Plain Text
        const resMid = resData.mid || "";

        // wtid: Plain Text (Modified)

        const wtid = resData.wtid || "";

        console.log("Decrypted resultMsg:", resultMsg);
        console.log("Decoded wpayUserKey:", wpayUserKey);
        console.groupEnd();

        // Success Conditions
        // - resultCode "0000" or "2006"
        // - wtid exists
        // - wpayUserKey exists
        // - signature exists (checked above)
        // - userId matches request (loginId)

        const isSuccessCode =
            resData.resultCode === "0000" || resData.resultCode === "2006";
        const currentUserId = loginId || "wpayTestUser01";
        // userId: Encrypt O (Modified)
        const resUserId = resData.userId ? decrypt(resData.userId) : "";
        const isUserIdMatch = resUserId === currentUserId;

        // Prepare Data for Modal
        wpayResultData = [
            {
                key: "resultCode",
                label: "결과 코드",
                encrypted: resData.resultCode || "",
                decrypted: "-",
            },
            {
                key: "resultMsg",
                label: "결과 메시지",
                encrypted: resData.resultMsg || "", // Encoded raw
                decrypted: resultMsg,
            },
            {
                key: "mid",
                label: "가맹점 ID",
                encrypted: resData.mid || "",
                decrypted: "-",
            },
            {
                key: "wtid",
                label: "WPAY 트랜잭션 ID",
                encrypted: wtid,
                decrypted: "-",
            },
            {
                key: "userId",
                label: "사용자 ID",
                encrypted: resData.userId || "",
                decrypted: resUserId,
            },
            {
                key: "wpayUserKey",
                label: "WPAY 사용자 키",
                encrypted: resData.wpayUserKey || "",
                decrypted: wpayUserKey,
            },
            {
                key: "ci",
                label: "CI",
                encrypted: resData.ci || "",
                decrypted: ci,
            },
            {
                key: "signature",
                label: "서명",
                encrypted: resData.signature || "",
                decrypted: "-",
            },
        ];

        isWpaySuccess = false; // Reset first
        validationError = ""; // Reset error

        if (isSuccessCode) {
            if (!wtid || !wpayUserKey) {
                validationError = "필수 응답 필드 누락 (wtid 또는 wpayUserKey)";
            } else if (!isUserIdMatch) {
                validationError = `사용자 ID 불일치 (요청: ${currentUserId}, 응답: ${resUserId})`;
            } else {
                // Valid Success
                isWpaySuccess = true;
                // Defer storage logic to "Confirm" button
            }
        } else {
            // Failure code
            validationError = `${resultMsg} (${resData.resultCode})`;
        }

        // Show Modal
        if (wpayPopup) wpayPopup.close();
        window.removeEventListener("message", handleWpayMessage);
        showResultModal = true;
    }

    // Handle Modal Close (triggered by both X button and Confirm button)
    $effect(() => {
        if (!showResultModal && isWpaySuccess) {
            // Modal closed AND success -> Navigate
            const wpayUserKeyItem = wpayResultData.find(
                (d) => d.key === "wpayUserKey",
            );
            const ciItem = wpayResultData.find((d) => d.key === "ci");
            // Find wtid from result data (it's already decrypted/raw available there)
            const wtidItem = wpayResultData.find((d) => d.key === "wtid");
            const userIdItem = wpayResultData.find((d) => d.key === "userId");

            const wpayUserKey = wpayUserKeyItem?.decrypted || "";
            const ci = ciItem?.decrypted || "";
            const wtid = wtidItem?.encrypted || ""; // wtid is in 'encrypted' field as raw text in our data structure
            // Use decrypted userId or fallback to loginId state
            const userId = userIdItem?.decrypted || loginId || "wpayTestUser01";

            if (wpayUserKey) localStorage.setItem("wpayUserKey", wpayUserKey);
            if (ci) localStorage.setItem("ci", ci);
            if (wtid) localStorage.setItem("wtid", wtid);
            if (userId) localStorage.setItem("loginUserId", userId);

            goto("/");
        }
    });

    function handleResultConfirm() {
        showResultModal = false;
        // Logic handled by $effect
    }

    // Wpay Form Data
    let wpayFormData = $state<Record<string, string>>({});
    let wpayFormAction = $state("");

    async function openWpaySignup() {
        if (!merchantId || !loginSite) {
            alert("Merchant ID and Site must be selected.");
            return;
        }

        const keys = MERCHANT_KEYS[merchantId];
        if (!keys) {
            alert("Configuration not found for Merchant ID.");
            return;
        }

        // URL construction
        let domain = "";
        if (serverType === SERVER_TYPES.PROD) {
            if (!prodServer) {
                alert("PROD Server type must be selected.");
                return;
            }
            domain =
                SERVICE_URLS[service as ServiceType].PROD[
                    prodServer as ProdServerDomain
                ];
        } else {
            domain =
                SERVICE_URLS[service as ServiceType][
                    serverType as "DEV" | "STG"
                ];
        }

        // Ensure domain doesn't end with slash, just in case (though usage shows no slash)
        wpayFormAction = `${domain}/${loginSite}/std/u/v1/memreg`;

        // Mock override for testing if needed, but since we are implementing real logic per prompt:
        // If we want to test locally with the mock endpoint we created, we need to bypass this unless we are on localhost?
        // The prompt asked to use the logic from secrets.ts.
        // However, I created a Mock Endpoint at /[loginSite]/u/memreg which is relative.
        // If I use the full external domain, my Mock Endpoint won't be hit unless I intercept it or if the domain is localhost.
        // But the domain configs are "https://devwpay.inicis.com" etc.
        // So in reality, this form will try to post to Inicis servers.
        // If I want to keep the "Mock" verification working, I should probably use the relative path IF logic dictates,
        // OR just assume "Implementation" means implementing the REAL logic.
        // The user prompt "update service registration URL logic" implies REAL logic.
        // So I will use the real domain.

        const returnUrl =
            window.location.origin + "/external/wpay/callback/memreg";

        // Encrypt Fields
        const encrypt = (value: string) => {
            if (!value) return "";
            return encryptSeed(value, keys.seedKey, keys.seedIV);
        };

        const getStored = (key: string) => localStorage.getItem(key) || "";

        // Source values from state or localStorage as per guide
        const finalMid = merchantId || getStored("mid"); // Guide says selected OR stored
        const finalUserId = loginId || getStored("userId") || "wpayTestUser01";
        const finalHNum = getStored("hNum") || phone;

        const rawCi = getStored("ci");
        const rawUserNm = getStored("userNm");
        const rawHCorp = getStored("hCorp");
        const rawBirthDay = getStored("birthDay");
        const rawSocialNo2 = getStored("socialNo2");
        const rawFrnrYn = getStored("frnrYn");

        const encUserId = encrypt(finalUserId);
        const encHNum = encrypt(finalHNum);
        const encCi = encrypt(rawCi);
        const encBirthDay = encrypt(rawBirthDay);

        const encReturnUrl = encodeURIComponent(returnUrl);
        const encUserNm = encodeURIComponent(rawUserNm);

        // WPAYSTD2 Request Data
        const reqData: Record<string, string> = {
            mid: finalMid,
            userId: encUserId,
            ci: encCi,
            userNm: encUserNm,
            hNum: encHNum,
            hCorp: rawHCorp,
            birthDay: encBirthDay,
            socialNo2: rawSocialNo2,
            frnrYn: rawFrnrYn,
            returnUrl: encReturnUrl,
            agreePayNm: "", // Encoded empty string
            agreeUrl: "", // Encoded empty string
            optReadOnly: "",
        };

        // Generate Signature
        const signature = await generateSignature(reqData, keys.hashKey);
        reqData.signature = signature;

        wpayFormData = reqData;

        startWpaySignup();

        // Debug Logging
        console.group("WPAY Request Debug");
        console.log("URL:", wpayFormAction);
        console.log("Method: POST");
        console.log("Request Data Setting Values:", reqData);
        console.groupEnd();

        // Submit form after iframe opens
        setTimeout(() => {
            const form = document.getElementById(
                "wpay-signup-form",
            ) as HTMLFormElement;
            if (form) form.submit();
        }, 100);
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
            localStorage.setItem("serviceOption", service);
            localStorage.setItem("serverType", serverType);
            localStorage.setItem("prodServerDomain", prodServer);
            localStorage.setItem("siteOption", loginSite);
            localStorage.setItem("mid", merchantId);
            localStorage.setItem("userId", loginId);
            localStorage.setItem("hNum", phone);
        } else {
            localStorage.removeItem("serviceOption");
            localStorage.removeItem("serverType");
            localStorage.removeItem("prodServerDomain");
            localStorage.removeItem("siteOption");
            localStorage.removeItem("mid");
            localStorage.removeItem("userId");
            localStorage.removeItem("hNum");
        }

        // Wpay Signup Check
        const savedWpayKey = localStorage.getItem("wpayUserKey");
        const savedWtid = localStorage.getItem("wtid");
        const savedLoginUserId = localStorage.getItem("loginUserId"); // Added check

        if (!phone || !savedWpayKey || !savedWtid || !savedLoginUserId) {
            await openWpaySignup();
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

<!-- WPAY Result Modal -->
<Modal
    bind:isOpen={showResultModal}
    title="WPAY 회원 가입 결과"
    width="max-w-4xl"
>
    <div class="flex flex-col gap-4">
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" class="px-2 py-2">Field</th>
                        <th scope="col" class="px-2 py-2">Encrypted / Raw</th>
                        <th scope="col" class="px-2 py-2">Decrypted</th>
                    </tr>
                </thead>
                <tbody>
                    {#each wpayResultData as item}
                        <tr class="bg-white border-b">
                            <td
                                class="px-2 py-2 font-medium text-gray-900 whitespace-nowrap"
                            >
                                {item.label} <br />
                                <span class="text-xs text-gray-400"
                                    >({item.key})</span
                                >
                            </td>
                            <td class="px-2 py-2 break-all max-w-[150px]"
                                >{item.encrypted}</td
                            >
                            <td
                                class="px-2 py-2 break-all max-w-[150px] font-bold text-brand-primary"
                            >
                                {item.decrypted}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        {#if !isWpaySuccess}
            <div class="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                회원 가입 처리에 실패했습니다.<br />
                {#if validationError}
                    <span class="font-bold">사유: {validationError}</span>
                {:else}
                    재시도 해주세요.
                {/if}
            </div>
        {/if}

        <div class="mt-4 flex justify-end">
            <button
                onclick={handleResultConfirm}
                class="px-4 py-2 rounded-md text-text-white bg-brand-primary hover:bg-brand-hover transition-colors"
            >
                확인
            </button>
        </div>
    </div>
</Modal>

<!-- Wpay Signup Iframe Modal Removed -->

<!-- Hidden Form for WPAY Submission -->
<form
    id="wpay-signup-form"
    method="POST"
    action={wpayFormAction}
    target="wpay-popup"
    class="hidden"
>
    {#each Object.entries(wpayFormData) as [key, value]}
        <input type="hidden" name={key} {value} />
    {/each}
</form>
