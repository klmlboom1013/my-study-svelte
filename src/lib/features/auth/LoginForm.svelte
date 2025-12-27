<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { goto } from "$app/navigation";
    import {
        createAccessToken,
        validateAccessToken,
    } from "$lib/utils/auth/accessToken";
    import { setCookie, getCookie } from "$lib/utils/cookie";

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
    } from "$lib/constants/wpayServerType";
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
            return { value: type, label: type };
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
        const storedData = localStorage.getItem("sign-in-page");
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                service = parsedData.service || "";
                server = (parsedData.server as ServerType) || "";
                prodDomain = parsedData.prodDomain || "";
                site = parsedData.site || "";
                mid = parsedData.mid || "";
                userId = parsedData.userId || "";
                hNum = parsedData.hNum || "";
                isSaveCache = parsedData.isSaveCache || false;
            } catch (e) {
                console.error("Failed to parse sign-in-page data", e);
            }
        }

        // Check AccessToken for Auto Login
        const storedTokenStr = getCookie("accessToken");
        if (storedTokenStr && mid) {
            try {
                const isValid = await validateAccessToken(storedTokenStr, mid);
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

        // Determine if this is PIN Auth or Signup/Check response?
        // The structure is slightly different.
        // PIN Auth Response fields: resultCode, resultMsg, mid, wtid, wpayUserKey, signature.
        // Signup Response fields: resultCode, resultMsg, mid, wtid, userId, wpayUserKey, ci, signature.
        // We can check for existence of 'userId' to distinguish.
        // PIN Auth doesn't have 'userId' or 'ci' in response (per guide table).

        let isPinAuthResponse = !resData.userId && !resData.ci;

        let responseSigningOrder: string[] = [];
        if (isPinAuthResponse) {
            responseSigningOrder = [
                "resultCode",
                "resultMsg",
                "mid",
                "wtid",
                "wpayUserKey",
            ];
        } else {
            responseSigningOrder = [
                "resultCode",
                "resultMsg",
                "mid",
                "wtid",
                "userId",
                "wpayUserKey",
                "ci",
            ];
        }

        // 1. Signature Verification
        if (resData.signature) {
            const { signature: calculatedSignature } = await generateSignature(
                resData,
                keys.hashKey,
                responseSigningOrder,
            );

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

        const resultMsg = resData.resultMsg
            ? decode(resData.resultMsg).replace(/\+/g, " ")
            : "";
        const wpayUserKey = resData.wpayUserKey
            ? decrypt(resData.wpayUserKey)
            : "";
        const wtid = resData.wtid || "";
        const resMid = resData.mid || "";

        // Signup Specific
        const ci = resData.ci ? decrypt(resData.ci) : "";
        const resUserId = resData.userId ? decrypt(resData.userId) : "";

        console.log("Decrypted resultMsg:", resultMsg);
        console.groupEnd();

        // Success Conditions
        const isSuccessCode =
            resData.resultCode === "0000" || resData.resultCode === "2006";

        // Logic split
        if (isPinAuthResponse) {
            // PIN Auth Success Conditions
            // resultCode 0000/2006
            // wtid, wpayUserKey exists
            isWpaySuccess =
                isSuccessCode && !!wtid && !!wpayUserKey && !!resData.signature;

            if (isWpaySuccess) {
                // For PIN Auth, we don't check userId match because it's not in response.
                validationError = "";
            } else {
                validationError = `${resultMsg} (${resData.resultCode})`;
                // Remove wpayUserKey from localStorage on PIN Auth failure
                try {
                    const stored = localStorage.getItem("sign-in-page");
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        delete parsed.wpayUserKey;
                        localStorage.setItem(
                            "sign-in-page",
                            JSON.stringify(parsed),
                        );
                    }
                } catch (e) {}
            }

            // Set Data for Modal
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
                    key: "mid",
                    label: "가맹점 ID",
                    encrypted: resMid,
                    decrypted: "-",
                },
                {
                    key: "wtid",
                    label: "WPAY 트랜잭션 ID",
                    encrypted: wtid,
                    decrypted: "-",
                },
                {
                    key: "wpayUserKey",
                    label: "WPAY 사용자 키",
                    encrypted: resData.wpayUserKey || "",
                    decrypted: wpayUserKey,
                },
                {
                    key: "signature",
                    label: "서명",
                    encrypted: resData.signature || "",
                    decrypted: "-",
                },
            ];
        } else {
            // Signup Success Conditions
            const currentUserId = userId || "wpayTestUser01";
            const isUserIdMatch = resUserId === currentUserId;

            isWpaySuccess =
                isSuccessCode &&
                !!wtid &&
                !!wpayUserKey &&
                isUserIdMatch &&
                !!resData.signature;

            if (isWpaySuccess) {
                validationError = "";
                // Save wpayUserKey to localStorage on Signup success
                try {
                    const stored = localStorage.getItem("sign-in-page");
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        parsed.wpayUserKey = wpayUserKey;
                        localStorage.setItem(
                            "sign-in-page",
                            JSON.stringify(parsed),
                        );
                    }
                } catch (e) {}
            } else {
                if (!isUserIdMatch) {
                    validationError = `사용자 ID 불일치 (요청: ${currentUserId}, 응답: ${resUserId})`;
                } else {
                    validationError = `${resultMsg} (${resData.resultCode})`;
                }
            }

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
                    key: "mid",
                    label: "가맹점 ID",
                    encrypted: resMid,
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
        }

        // Show Modal
        if (wpayPopup) wpayPopup.close();
        window.removeEventListener("message", handleWpayMessage);
        showResultModal = true;
    }

    async function handleAccessTokenCreation() {
        const wpayUserKeyItem = wpayResultData.find(
            (d) => d.key === "wpayUserKey",
        );
        const wtidItem = wpayResultData.find((d) => d.key === "wtid");
        // PIN Auth result doesn't have userId, so fallback to state
        const userIdItem = wpayResultData.find((d) => d.key === "userId");

        const wpayUserKey = wpayUserKeyItem?.decrypted || "";
        const wtid = wtidItem?.decrypted || wtidItem?.encrypted || ""; // wtid has no decrypt logic in view
        const finalUserId = userIdItem?.decrypted || userId || "wpayTestUser01";

        try {
            const token = await createAccessToken({
                server: server,
                site: site,
                service: service,
                wpayUserKey,
                wtid,
                userId: finalUserId,
                mid: mid,
            });

            setCookie("accessToken", token, 1); // Save for 1 day
            goto("/");
        } catch (e) {
            console.error("Token creation failed", e);
            alert("로그인 토큰 생성 실패");
        }
    }

    function handleResultConfirm() {
        showResultModal = false;

        if (isWpaySuccess) {
            // Check Context:
            // 1. Was it Membership Check? (Detected by presence of 'status' in resultData, which only Check has)
            const isMembershipCheck = wpayResultData.some(
                (d) => d.key === "status",
            );

            if (isMembershipCheck) {
                // STEP 01 Success -> Proceed to STEP 02 (PIN Auth)
                handlePinAuth();
            } else {
                // STEP 00 (Signup) OR STEP 02 (PIN Auth) Success -> Create Token
                handleAccessTokenCreation();
            }
        }
    }

    function handleResultSignUp() {
        showResultModal = false;
        hNum = "";
        openWpaySignup();
    }

    function handleResultClose() {
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

            // Save wpayUserKey to localStorage on success
            if (isSuccess && wpayUserKey) {
                try {
                    const stored = localStorage.getItem("sign-in-page");
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        parsed.wpayUserKey = wpayUserKey;
                        localStorage.setItem(
                            "sign-in-page",
                            JSON.stringify(parsed),
                        );
                    }
                } catch (e) {
                    console.error("Failed to save wpayUserKey", e);
                }
            }

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
            window.location.origin + `/callback/wpaystd2/${site}/memreg`;

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

    // Touch Interaction Handler
    function handleTouchStart() {
        if (touchTimer) clearTimeout(touchTimer);
        transitionDuration = 200; // Instant/Quick on start
        showMissingFields = true;
    }

    // PIN Auth Logic
    async function handlePinAuth() {
        if (!mid || !site) {
            alert("Merchant ID and Site must be selected.");
            return;
        }

        const keys = MERCHANT_KEYS[mid];
        if (!keys) {
            alert("Configuration not found for Merchant ID.");
            return;
        }

        // URL construction for PIN Auth
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

        // URI: /{site name}/std/u/v1/pinno/auth (Ref: prompt/WPAYSTD2/2. WPAY PIN Auth.md)
        wpayFormAction = `${domain}/${site}/std/u/v1/pinno/auth`;

        const returnUrl =
            window.location.origin + `/callback/wpaystd2/${site}/pinno/auth`;

        // Encrypt Fields
        const encrypt = (value: string) => {
            if (!value) return "";
            return encryptSeed(value, keys.seedKey, keys.seedIV);
        };

        const getStored = (key: string) => localStorage.getItem(key) || "";

        // Source values
        const finalMid = mid;

        // wpayUserKey from STEP01 result
        const wpayUserKeyItem = wpayResultData.find(
            (d) => d.key === "wpayUserKey",
        );
        let storedWpayUserKey = "";
        try {
            const s = localStorage.getItem("sign-in-page");
            if (s) storedWpayUserKey = JSON.parse(s).wpayUserKey || "";
        } catch (e) {}

        const rawWpayUserKey =
            wpayUserKeyItem?.decrypted || storedWpayUserKey || "";

        if (!rawWpayUserKey) {
            alert("Checking User Key failed. Please try again.");
            return;
        }

        // ci from STEP01 result or localStorage
        const ciItem = wpayResultData.find((d) => d.key === "ci");
        const rawCi = ciItem?.decrypted || getStored("ci") || "";

        const encWpayUserKey = encrypt(rawWpayUserKey);
        const encReturnUrl = encodeURIComponent(returnUrl);

        // Request Data
        const reqData: Record<string, string> = {
            mid: finalMid,
            wpayUserKey: encWpayUserKey,
            ci: rawCi,
            returnUrl: encReturnUrl,
        };

        // Generate Signature
        // Signing Order: mid, wpayUserKey, ci, returnUrl
        const requestSigningOrder = ["mid", "wpayUserKey", "ci", "returnUrl"];
        const { signature } = await generateSignature(
            reqData,
            keys.hashKey,
            requestSigningOrder,
        );
        reqData.signature = signature;

        wpayFormData = reqData;

        // Wait for DOM
        await tick();

        startWpaySignup(); // Reuse popup logic

        // Debug
        console.group("WPAY PIN Auth Request Debug");
        console.log("URL:", wpayFormAction);
        console.log("Data:", reqData);
        console.groupEnd();

        // Submit
        setTimeout(() => {
            const form = document.getElementById(
                "wpay-signup-form",
            ) as HTMLFormElement;
            if (form) form.submit();
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

        // Check AccessToken Validity
        const storedTokenStr = getCookie("accessToken");
        let isTokenValid = false;

        if (storedTokenStr) {
            try {
                // Validate with current selected merchantId
                isTokenValid = await validateAccessToken(storedTokenStr, mid);

                // Additional Check: Does the token belong to the current user?
                if (isTokenValid) {
                    try {
                        const tokenPayload = decodeJwt(storedTokenStr);
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

        // STEP 01: Membership Check
        if (hNum) {
            await handleMembershipCheck();
            return;
        }

        // STEP 00: Signup
        await openWpaySignup();
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

    async function handleNextClick() {
        // Set default userId if empty
        if (!userId) {
            userId = "wpayTestUser01";
        }

        // Save to LocalStorage if isSaveCache is true
        if (isSaveCache) {
            const dataToSave = {
                service,
                server,
                prodDomain,
                site,
                mid,
                userId,
                hNum,
                isSaveCache,
            };
            localStorage.setItem("sign-in-page", JSON.stringify(dataToSave));
        } else {
            // If not saving, should we clear? Prompt says:
            // "메인페이지에서 localStorage key "isSaveCache" 값이 true가 아니면 위 정보들을 localStorage에서 모두 삭제 한다."
            // This logic seems to belong to Main Page initialization or cleanup, but for now we won't strictly delete here to avoid data loss during session.
            // However, if the user explicitly unchecks, maybe we should remove the key?
            // Let's remove the key for now to be clean.
            localStorage.removeItem("sign-in-page");
        }

        // Branching Logic
        if (!hNum) {
            // Sign-up Flow
            await openWpaySignup();
        } else {
            // Sign-in Authorization Flow
            await handleMembershipCheck();
        }
    }
</script>

<div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
    <h1 class="text-2xl font-bold text-center text-brand-primary">
        WPAY 연동 테스트
    </h1>

    <div class="space-y-6">
        <!-- Service Selection -->
        <div class="space-y-2">
            <label
                for="service"
                class="block text-sm font-medium text-gray-700"
            >
                Service <span class="text-red-500">*</span>
            </label>
            <DropdownInput
                id="service"
                bind:value={service}
                options={serviceOptions}
                placeholder="선택해 주세요"
                isError={showMissingFields && !service}
            />
        </div>

        <!-- Server Selection -->
        <div class="space-y-2">
            <div class="flex items-center gap-1">
                <span class="block text-sm font-medium text-gray-700">
                    Server <span class="text-red-500">*</span>
                </span>
                {#if prodDomain && server === SERVER_TYPES.PROD}
                    <span class="text-sm text-brand-primary font-medium"
                        >({prodDomain})</span
                    >
                {/if}
            </div>
            <!-- Variant: Box as per prompt -->
            <RadioGroup
                groupName="server"
                options={serverOptionsWithLabels}
                bind:selected={server as string}
                onOptionClick={handleServerClick}
                isError={showMissingFields && !server}
                variant="box"
            />
        </div>

        <!-- Site Selection -->
        <div class="space-y-2">
            <label for="site" class="block text-sm font-medium text-gray-700">
                Site <span class="text-red-500">*</span>
            </label>
            <DropdownInput
                id="site"
                bind:value={site}
                options={siteOptions as string[]}
                placeholder="선택해 주세요"
                isError={showMissingFields && !site}
            />
        </div>

        <!-- Merchant ID Selection -->
        <div class="space-y-2">
            <label for="mid" class="block text-sm font-medium text-gray-700">
                Merchant ID <span class="text-red-500">*</span>
            </label>
            <DropdownInput
                id="mid"
                bind:value={mid}
                options={merchantIdOptions as string[]}
                placeholder="선택해 주세요"
                isError={showMissingFields && !mid}
            />
        </div>

        <!-- Member ID Input -->
        <div class="space-y-2">
            <label for="userId" class="block text-sm font-medium text-gray-700">
                Member ID
            </label>
            <input
                id="userId"
                type="text"
                bind:value={userId}
                placeholder="wpayTestUser01"
                class="w-full px-3 py-2 border-2 rounded-md outline-none text-brand-primary placeholder:text-ui-hint focus:ring-2 focus:ring-brand-primary focus:border-brand-primary border-brand-primary"
            />
        </div>

        <!-- Cell Phone Number Input -->
        <div class="space-y-2">
            <label for="hNum" class="block text-sm font-medium text-gray-700">
                Cell Phone Number
            </label>
            <input
                id="hNum"
                type="text"
                inputmode="numeric"
                bind:value={hNum}
                placeholder="입력해 주세요."
                oninput={handlePhoneInput}
                class="w-full px-3 py-2 border-2 rounded-md outline-none text-brand-primary placeholder:text-ui-hint focus:ring-2 focus:ring-brand-primary focus:border-brand-primary border-brand-primary"
            />
        </div>

        <!-- Save Cache Checkbox -->
        <!-- Save Cache Checkbox -->
        <div class="flex items-center gap-2">
            <input
                id="isSaveCache"
                type="checkbox"
                bind:checked={isSaveCache}
                class="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
            />
            <label
                for="isSaveCache"
                class="text-sm text-gray-600 cursor-pointer select-none"
            >
                Should I save to cache?
            </label>
        </div>

        <!-- Next Button -->
        <!-- Enabled only when required fields (service, server, site, mid) are selected -->
        <!-- As per prompt, visually indicate missing fields on hover if disabled -->
        <div
            class="pt-4"
            role="button"
            tabindex="0"
            onmouseenter={() => {
                // Check if disabled conditions met to show hints
                if (!service || !server || !site || !mid) {
                    showMissingFields = true;
                }
            }}
            onmouseleave={() => {
                showMissingFields = false;
            }}
            ontouchstart={handleTouchStart}
            ontouchend={() => {
                if (touchTimer) clearTimeout(touchTimer);
                touchTimer = setTimeout(() => {
                    showMissingFields = false;
                }, 2000); // 2 seconds delay
            }}
        >
            <button
                onclick={handleNextClick}
                disabled={!service || !server || !site || !mid}
                class={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all duration-200
                        ${
                            !service || !server || !site || !mid
                                ? "bg-ui-inactive cursor-not-allowed opacity-70"
                                : "bg-brand-primary hover:bg-brand-hover shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                        }`}
            >
                Next
            </button>
        </div>
    </div>
</div>

<!-- Prod Domain Modal -->
<Modal bind:isOpen={showProdModal} title="PROD-Domain">
    <div class="space-y-4">
        <RadioGroup
            groupName="prodDomain"
            options={prodServerOptions.map((opt) => ({
                value: opt,
                label: opt,
            }))}
            bind:selected={prodDomain}
            direction="column"
            variant="box"
            onOptionClick={() => {
                showProdModal = false; // Close on selection ? Prompt says "Modal을 오픈한다" on PROD select, implies selection closes it or explicit close? Usually selection closes or there's a confirm.
                // Prompt: "PROD_SERVER_DOMAINS 값을 선택 하면... 문구를 표시 한다."
                // Does not strictly say close, but better UX to close or have OK button.
                // Modal component has Close X button. Let's keep it open until user closes or maybe auto close?
                // Let's auto close for better flow as it's a single selection.
                // Re-reading prompt: "Server 선택 영역 Radio Button 값이 PROD로 선택 했을 때... Modal을 오픈한다."
                // "PROD_SERVER_DOMAINS 값을 선택 하면... (선택한 PROD_SERVER_DOMAINS) 문구를 표시 한다."
                // Let's keep it open or provide a button?
                // Given typical mobile/web flows for single select modal, auto-close is good.
                showProdModal = false;
            }}
        />
    </div>
</Modal>

<!-- WPAY Result Modal -->
<WpayResultModal
    isOpen={showResultModal}
    title={isWpaySuccess ? "WPAY 요청 결과" : "WPAY 요청 결과 (실패)"}
    resultData={wpayResultData}
    confirmText={isWpaySuccess && wpayResultData.some((d) => d.key === "status")
        ? "핀인증"
        : "확인"}
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
