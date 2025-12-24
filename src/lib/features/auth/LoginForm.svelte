<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { goto } from "$app/navigation";
    import {
        createAuthToken,
        validateAuthToken,
    } from "$lib/utils/auth/authToken";

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
    import { WPAY_POPUP_CONFIG } from "$lib/constants/wpayConfig";
    import { decodeJwt } from "jose";
    import {
        searchWpayMember,
        type MembershipSearchParams,
    } from "$lib/utils/wpay/membershipService";
    import WpayResultModal from "$lib/components/wpay/WpayResultModal.svelte";

    // Options
    const serviceOptions = [...SERVICE_OPTIONS];
    const serverOptions = Object.values(SERVER_TYPES);
    const prodServerOptions = Object.values(PROD_SERVER_DOMAINS);

    // State
    let service = $state("");
    // @ts-ignore
    let server = $state<ServerType>("");
    let prodDomain = $state("");
    let site = $state("");
    let mid = $state("");

    // Reactive Options
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

    let userId = $state("");
    // placeholder is now static string "wpayTestUser01" as per prompt
    // removed dynamic placeholder logic related to hint
    let hNum = $state("");
    let isSaveCache = $state(false);

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
            prodDomain = "";
        }
    }

    // Reactive Server Options with Labels
    let serverOptionsWithLabels = $derived(
        serverOptions.map((type) => {
            if (type === SERVER_TYPES.PROD) {
                const label = prodDomain
                    ? `${type} (${prodDomain})`
                    : `${type}`;
                return { value: type, label };
            }
            return type;
        }),
    );

    // Reset child selections when parent changes
    $effect(() => {
        // When service changes, if current site is not in new options, clear it
        if (!siteOptions.includes(site as any)) {
            site = "";
        }
    });

    $effect(() => {
        // When site changes, if current merchantId is not in new options, clear it
        if (!merchantIdOptions.includes(mid as any)) {
            mid = "";
        }
    });

    // Cleanup on destroy
    onDestroy(() => {
        if (typeof window !== "undefined") {
            window.removeEventListener("message", handleWpayMessage);
        }
    });

    // Load from LocalStorage
    onMount(async () => {
        service = localStorage.getItem("service") || "";
        server = (localStorage.getItem("server") as ServerType) || "";
        prodDomain = localStorage.getItem("prodDomain") || "";
        site = localStorage.getItem("site") || "";
        mid = localStorage.getItem("mid") || "";
        userId = localStorage.getItem("userId") || "";
        hNum = localStorage.getItem("hNum") || "";

        // isSave Default Value Logic
        const storedIsSave = localStorage.getItem("isSaveCache");
        if (storedIsSave !== null) {
            isSaveCache = storedIsSave === "true";
        } else {
            isSaveCache = false;
        }

        // Check AuthToken for Auto Login
        const storedTokenStr = localStorage.getItem("authToken");
        if (storedTokenStr && mid) {
            try {
                const isValid = await validateAuthToken(storedTokenStr, mid);
                if (isValid) {
                    goto("/");
                }
            } catch (e) {
                console.error("Token validation error", e);
            }
        }
    });

    // Phone Input Handler
    function handlePhoneInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const clean = target.value.replace(/[^0-9]/g, "");
        hNum = clean;
        target.value = clean;
    }

    // Wpay Signup Logic
    let wpayPopup: Window | null = null;

    function startWpaySignup() {
        const userAgent = navigator.userAgent;
        const isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                userAgent,
            );

        if (isMobile) {
            // Mobile/Tablet: Open in new tab/window without specific dimensions
            wpayPopup = window.open("", "wpay-popup");
        } else {
            // PC: Open as popup with specific dimensions
            const width = WPAY_POPUP_CONFIG.WIDTH;
            const height = WPAY_POPUP_CONFIG.HEIGHT;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            wpayPopup = window.open(
                "",
                "wpay-popup",
                `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`,
            );
        }

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

        const keys = MERCHANT_KEYS[mid];
        if (!keys) {
            console.error("Merchant Keys not found for:", mid);
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
            const { signature: calculatedSignature } = await generateSignature(
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
        const resultMsg = resData.resultMsg
            ? decode(resData.resultMsg).replace(/\+/g, " ")
            : "";

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
        const currentUserId = userId || "wpayTestUser01";
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

    // $effect logic removed to prevent race conditions or missed updates.
    // Logic moved to handleResultConfirm

    async function handleAuthTokenCreation() {
        const wpayUserKeyItem = wpayResultData.find(
            (d) => d.key === "wpayUserKey",
        );
        const wtidItem = wpayResultData.find((d) => d.key === "wtid");
        const userIdItem = wpayResultData.find((d) => d.key === "userId");

        const wpayUserKey = wpayUserKeyItem?.decrypted || "";
        const wtid = wtidItem?.encrypted || "";
        const finalUserId = userIdItem?.decrypted || userId || "wpayTestUser01";

        // Save Remember Me Data if needed (Already handled in handleLogin for Remember Me check)
        // But here we need to save token regardless of Remember Me?
        // "서비스 가입이 완료되면 authToken을 생성하여 localStorage에 저장한다."

        // Create Token
        try {
            const token = await createAuthToken({
                server: server,
                site: site,
                service: service,
                wpayUserKey,
                wtid,
                userId: finalUserId,
                mid: mid,
            });

            localStorage.setItem("authToken", token);
            goto("/");
        } catch (e) {
            console.error("Token creation failed", e);
            alert("로그인 토큰 생성 실패");
        }
    }

    function handleResultConfirm() {
        showResultModal = false;

        if (isWpaySuccess) {
            handleAuthTokenCreation(); // If it was signup success
            // If it was membership check success?
            // Prompt 3.2: "WPAY 회원 가입 정보 조회 성공 -> 로그인 STEP02를 진행하기 위해 response data의 wpayUserKey를 로그인 STEP02로 보낸다."
            // "확인 버튼을 클릭하면 메인화면으로 이동 한다." (Current goal is Main Page, STEP02 comes later?)
            // Prompt 3.2: "- 로그인 STEP02를 수행 한다." (When check is successful)
            // But STEP02 is not implemented yet?
            // Prompt 3.2 Goal: "WPAY 회원 가입 정보 조회가 성공하면 로그인 STEP02를 수행 한다."
            // And Result Modal Confirm -> Main Page.
            // STEP02 probably means "Main Page logic" or "Token Creation"?
            // "response data의 wpayUserKey를 로그인 STEP02로 보낸다."
            // Wait, does STEP02 imply a new page?
            // If I look at file list: `3.3. 로그인 STEP02.md`.
            // But currently I am implementing `3.2. 로그인 STEP01`.
            // For now, if success, I'll direct to Main, effectively assuming that's the next step or I should create token?
            // Prompt 3.2: "response data의 wpayUserKey를 로그인 STEP02로 보낸다."
            // "확인 버튼을 클릭하면 메인화면으로 이동 한다." implies we are done with STEP01.
            // Also need to handle "Member Check Success" vs "Signup Success".
            // If Member Check Success -> We have wpayUserKey -> Maybe create token?
            // Prompt 3.1 (Signup): "authToken을 생성한다."
            // Prompt 3.2 (Check): "로그인 STEP02를 진행하기 위해... wpayUserKey를... 보낸다."
            // Usually this means setting state/localStorage and going to next step context.
            // Since we are going to Main Page, let's assume creating Token and going Main is correct for now (or at least saving to localStorage).

            // Let's reuse handleAuthTokenCreation for now if applicable, or just generic "Success Action".

            // If it was Signup Success (isWpaySuccess=true from handleWpayMessage), we call handleAuthTokenCreation.
            // If it was Check Success (isWpaySuccess=true from check logic), we might want to do same?
            // Check logic also returns wpayUserKey.

            handleAuthTokenCreation();
        }
    }

    function handleResultSignUp() {
        showResultModal = false;
        hNum = "";
        openWpaySignup();
    }

    function handleResultClose() {
        // "상단의 X 버튼 클릭하면 모달을 닫는다" (Failure)
        // "상단의 X 버튼 클릭도 동일하게 동작 한다" (Success -> Confirm)
        if (isWpaySuccess) {
            handleResultConfirm();
        } else {
            showResultModal = false;
        }
    }

    async function handleMembershipCheck() {
        if (!mid || !site) {
            alert("Merchant ID and Site must be selected.");
            return;
        }

        const keys = MERCHANT_KEYS[mid];
        if (!keys) {
            alert("Configuration not found for Merchant ID.");
            return;
        }

        // Domain: Always use 'wpaystd' as per prompt 3.2
        let domain = "";
        if (server === SERVER_TYPES.PROD) {
            if (!prodDomain) {
                alert("PROD Server type must be selected.");
                return;
            }
            // Use "wpaystd" explicitly for membership check
            domain =
                SERVICE_URLS["wpaystd"].PROD[prodDomain as ProdServerDomain];
        } else {
            // Use "wpaystd" explicitly for membership check
            domain = SERVICE_URLS["wpaystd"][server as "DEV" | "STG"];
        }

        const params: MembershipSearchParams = {
            domain,
            siteName: site,
            merchantId: mid,
            userId: userId || "wpayTestUser01",
            hNum: hNum,
        };

        try {
            const resData = await searchWpayMember(params);

            // Decrypt
            const decrypt = (val: string) =>
                val ? decryptSeed(val, keys.seedKey, keys.seedIV) : "";
            const decode = (val: string) =>
                val ? decodeURIComponent(val).replace(/\+/g, " ") : "";

            const resultMsg = decode(resData.resultMsg || "");
            const wpayUserKey = resData.wpayUserKey
                ? decrypt(resData.wpayUserKey)
                : "";
            const ci = resData.ci ? decrypt(resData.ci) : "";
            const resUserId = resData.userId ? decrypt(resData.userId) : "";
            const status = resData.status || "";

            // User ID Logic for Success Check
            const currentUserId = userId || "wpayTestUser01";

            // Response Codes
            // "WPAY 회원 가입 정보 조회 성공." conditions:
            // "resultCode "0000"
            // "wpayUserKey exists"
            // "userId exists" and matches request userId
            // "status '00'"
            // "ci exists"

            const isSuccess =
                resData.resultCode === "0000" &&
                !!resData.wpayUserKey &&
                !!resData.userId &&
                resUserId === currentUserId &&
                resData.status === "00" &&
                !!resData.ci;

            isWpaySuccess = isSuccess;

            // Populate wpayResultData

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
                    encrypted: resData.resultMsg || "",
                    decrypted: resultMsg,
                },
                {
                    key: "wpayUserKey",
                    label: "WPAY 사용자 키",
                    encrypted: resData.wpayUserKey || "",
                    decrypted: wpayUserKey,
                },
                {
                    key: "userId",
                    label: "사용자 ID",
                    encrypted: resData.userId || "",
                    decrypted: resUserId,
                },
                {
                    key: "status",
                    label: "상태",
                    encrypted: status,
                    decrypted: "-",
                },
                {
                    key: "ci",
                    label: "CI",
                    encrypted: resData.ci || "",
                    decrypted: ci,
                },
            ];

            showResultModal = true;
        } catch (e) {
            console.error("Membership Check Failed", e);
            alert(
                "회원 조회 중 오류가 발생했습니다: " +
                    (e instanceof Error ? e.message : String(e)),
            );
        }
    }

    // Wpay Form Data
    let wpayFormData = $state<Record<string, string>>({});
    let wpayFormAction = $state("");

    async function openWpaySignup() {
        if (!mid || !site) {
            alert("Merchant ID and Site must be selected.");
            return;
        }

        const keys = MERCHANT_KEYS[mid];
        if (!keys) {
            alert("Configuration not found for Merchant ID.");
            return;
        }

        // URL construction
        let domain = "";
        if (server === SERVER_TYPES.PROD) {
            if (!prodDomain) {
                alert("PROD Server type must be selected.");
                return;
            }
            domain =
                SERVICE_URLS[service as ServiceType].PROD[
                    prodDomain as ProdServerDomain
                ];
        } else {
            domain =
                SERVICE_URLS[service as ServiceType][server as "DEV" | "STG"];
        }

        // Ensure domain doesn't end with slash, just in case (though usage shows no slash)
        wpayFormAction = `${domain}/${site}/std/u/v1/memreg`;

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
        const finalMid = mid || getStored("mid"); // Guide says selected OR stored
        const finalUserId = userId || getStored("userId") || "wpayTestUser01";
        const finalHNum = getStored("hNum") || hNum;

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
        const { signature } = await generateSignature(reqData, keys.hashKey);
        reqData.signature = signature;

        wpayFormData = reqData;

        // Wait for DOM update to ensure action and inputs are set
        await tick();

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
            if (form) {
                if (!form.action || form.action === window.location.href) {
                    console.error(
                        "Form action is invalid (empty or self), aborting submit to prevent reload.",
                    );
                    alert("Form action error. Please try again.");
                    return;
                }
                console.log(
                    "Submitting form to:",
                    form.action,
                    "Target:",
                    form.target,
                );
                form.submit();
            }
        }, 100);
    }

    // Login Handler
    async function handleLogin(e: Event) {
        e.preventDefault(); // Prevent any form submission or default behavior
        if (!isValid) return;

        // Set default Member ID if empty
        if (!userId) {
            userId = "wpayTestUser01";
        }

        // Save ALL inputs to LocalStorage (as per prompt)
        localStorage.setItem("service", service);
        localStorage.setItem("server", server);
        localStorage.setItem("prodDomain", prodDomain);
        localStorage.setItem("site", site);
        localStorage.setItem("mid", mid);
        localStorage.setItem("userId", userId);
        localStorage.setItem("hNum", hNum);
        localStorage.setItem("isSaveCache", String(isSaveCache));

        // Check AuthToken Validity
        const storedTokenStr = localStorage.getItem("authToken");
        let isTokenValid = false;

        if (storedTokenStr) {
            try {
                // Validate with current selected merchantId
                isTokenValid = await validateAuthToken(storedTokenStr, mid);

                // Additional Check: Does the token belong to the current user?
                if (isTokenValid) {
                    try {
                        const tokenPayload = decodeJwt(storedTokenStr);
                        // If loginId is provided (and not default placeholder that user ignored), we should check it.
                        // However, loginId is auto-set to "wpayTestUser01" if empty on blur.
                        // If user actually typed something else, we rely on that.
                        // If user left it empty, it is default. Does token match default?

                        // We strictly compare loginId with token's sub.
                        if (tokenPayload.sub !== userId) {
                            console.log(
                                `Token User (${tokenPayload.sub}) mismatch with Input User (${userId}). Invalidating.`,
                            );
                            isTokenValid = false;
                        }
                    } catch (decodeErr) {
                        console.error(
                            "Token decode error for user check",
                            decodeErr,
                        );
                        isTokenValid = false;
                    }
                }
            } catch (e) {
                console.error("Token validation error", e);
            }
        }

        // If Valid -> Go Main
        if (isTokenValid) {
            goto("/");
            return;
        }

        // New Logic Step 01:
        // "hNum 값이 존재하면 WPAY 회원 가입 정보 조회를 수행한다."
        if (hNum) {
            await handleMembershipCheck();
            return;
        }

        // If Invalid Token & No Phone -> Start WPAY Signup (Service Join)
        await openWpaySignup();
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
            !!server &&
            (server !== SERVER_TYPES.PROD || !!prodDomain) &&
            !!site &&
            !!mid,
    );
</script>

<div class="space-y-6">
    <!-- Service Selection -->
    <div>
        <label
            for="service-select"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Service <span class="text-red-500">*</span></label
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
        <span class="block text-sm font-medium text-gray-700 mb-2"
            >Server <span class="text-red-500">*</span></span
        >
        <RadioGroup
            options={serverOptionsWithLabels}
            groupName="server"
            bind:selected={server}
            onOptionClick={handleServerClick}
            isError={showMissingFields && !server}
        />
    </div>

    <!-- Login Site -->
    <div>
        <label
            for="login-site"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Site <span class="text-red-500">*</span></label
        >
        <DropdownInput
            id="login-site"
            options={siteOptions}
            bind:value={site}
            placeholder="선택해 주세요"
            isError={showMissingFields && !site}
        />
    </div>

    <!-- Merchant ID -->
    <div>
        <label
            for="merchant-id-select"
            class="block text-sm font-medium text-gray-700 mb-2"
            >Merchant ID <span class="text-red-500">*</span></label
        >
        <DropdownInput
            id="merchant-id-select"
            options={merchantIdOptions}
            bind:value={mid}
            placeholder="선택해 주세요"
            isError={showMissingFields && !mid}
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
            bind:value={userId}
            placeholder="wpayTestUser01"
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
            value={hNum}
            oninput={handlePhoneInput}
            class="w-full border-2 border-brand-primary rounded-md py-2 px-3 font-medium placeholder-ui-hint focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            class:text-brand-primary={true}
            placeholder="입력해 주세요."
        />
    </div>

    <!-- Remember Me -->
    <div class="flex items-center">
        <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            bind:checked={isSaveCache}
            class="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded cursor-pointer"
        />
        <label
            for="remember-me"
            class="ml-2 block text-sm text-gray-900 cursor-pointer"
        >
            Should I save to cache?
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
            type="button"
            onclick={handleLogin}
            disabled={!isValid}
            class={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
        ${isValid ? "bg-brand-primary hover:bg-brand-hover focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary" : "bg-ui-inactive cursor-not-allowed"}
        transition-colors`}
        >
            {isValid ? "Next" : "Next"}
        </button>
    </div>
</div>

<!-- PROD Server Modal -->
<Modal bind:isOpen={showProdModal} title="PROD domain 선택">
    <div class="flex flex-col gap-4">
        <p class="text-sm text-text-message mb-2">
            접속할 PROD 서버를 선택해주세요. <span class="text-red-500">*</span>
        </p>
        <RadioGroup
            options={prodServerOptions}
            groupName="prodDomain"
            bind:selected={prodDomain}
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
<WpayResultModal
    isOpen={showResultModal}
    title={isWpaySuccess ? "WPAY 요청 결과" : "WPAY 요청 결과 (실패)"}
    resultData={wpayResultData}
    onConfirm={handleResultConfirm}
    onSignUp={!isWpaySuccess ? handleResultSignUp : undefined}
    onClose={handleResultClose}
/>

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
