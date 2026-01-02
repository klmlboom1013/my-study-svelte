<script lang="ts">
    interface Props {
        isModal?: boolean;
        onComplete?: () => void;
    }

    let { isModal = false, onComplete }: Props = $props();
    import { onMount, onDestroy, tick } from "svelte";
    import { goto } from "$app/navigation";
    import {
        createAccessToken,
        validateAccessToken,
    } from "$lib/utils/auth/accessToken";
    import { setCookie, getCookie } from "$lib/utils/cookie";

    import DropdownInput from "$lib/components/ui/DropdownInput.svelte";
    import RadioGroup from "$lib/components/ui/RadioGroup.svelte";
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
    import { AVATARS } from "$lib/constants/avatars";
    import { SERVICE_URLS } from "$lib/constants/wpayUrls";
    import { WPAY_POPUP_CONFIG } from "$lib/constants/wpayConfig";
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
    // State
    let isConfigVisible = $state(false);
    let service = $state("wpaystd2");
    // @ts-ignore
    let server = $state<ServerType>(SERVER_TYPES.STG);
    let prodDomain = $state(""); // Default to empty
    let site = $state("stdwpay");
    let mid = $state("INIwpayT03");

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

    let userId = $state("wpayTestUser01");
    let hNum = $state("");
    let isSaveCache = $state(false);
    let highlightMissing = $state(false);

    let isFormValid = $derived(!!service && !!server && !!site && !!mid);

    let showProdModal = $state(false);
    let showResultModal = $state(false);
    let isWpaySuccess = $state(false);
    let validationError = $state("");
    let wpayResultData = $state<
        {
            key: string;
            label: string;
            encrypted: string;
            decrypted: string;
        }[]
    >([]);
    let wpayResultTitle = $state("WPAY 요청 결과");
    let wpayResultButtonText = $state("확인");
    let modalNextAction = $state<"STEP2" | "SIGNUP" | "ACCESSTOKEN" | "CLOSE">(
        "CLOSE",
    );

    let wpayPopup: Window | null = null;
    let wpayFormData = $state<Record<string, string>>({});
    let wpayFormAction = $state("");

    // Radio Options Maps
    const serverRadioOptions = serverOptions.map((opt) => ({
        label: opt,
        value: opt,
    }));

    // Prod Domain Options for Modal
    const prodDomainRadioOptions = prodServerOptions.map((opt) => ({
        label: opt + " Domain",
        value: opt,
    }));

    // Reset child selections when parent changes
    $effect(() => {
        if (!siteOptions.includes(site as any)) {
            site = "";
        }
    });

    $effect(() => {
        if (!merchantIdOptions.includes(mid as any)) {
            mid = "";
        }
    });

    // Watch for Server Type change to trigger Modal
    $effect(() => {
        if (server === SERVER_TYPES.PROD) {
            showProdModal = true;
        } else {
            prodDomain = "";
        }
    });

    // Cleanup
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
                isSaveCache = parsedData.isSaveCache || false;

                if (isSaveCache) {
                    // Force defaults for fixed fields, ignore stored values for them
                    // service = parsedData.service || "wpaystd2";
                    // server = (parsedData.server as ServerType) || SERVER_TYPES.STG;
                    // site = parsedData.site || "stdwpay";
                    // mid = parsedData.mid || "INIwpayT03";

                    // Only load other fields
                    prodDomain = parsedData.prodDomain || "";

                    userId = parsedData.userId || "wpayTestUser01";
                    hNum = parsedData.hNum || "";
                } else {
                    // Reset to defaults if not saving cache
                    userId = "";
                    hNum = "";
                    // Other fields are already initialised empty
                    localStorage.removeItem("sign-in-page");
                }
            } catch (e) {
                console.error("Failed to parse sign-in-page data", e);
            }
        } else {
            // No stored data, ensure empty defaults
            userId = "";
        }

        const storedTokenStr = getCookie("accessToken");
        if (storedTokenStr && mid) {
            try {
                const isValid = await validateAccessToken(storedTokenStr, mid);
                if (isValid && !isModal) {
                    goto("/");
                }
            } catch (e) {
                console.error("Token validation error", e);
            }
        }
    });

    function handlePhoneInput(e: Event) {
        const target = e.target as HTMLInputElement;
        const clean = target.value.replace(/[^0-9]/g, "");
        hNum = clean;
        target.value = clean;
    }

    function startWpaySignup() {
        const userAgent = navigator.userAgent;
        const isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                userAgent,
            );

        if (isMobile) {
            wpayPopup = window.open("", "wpay-popup");
        } else {
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

        window.addEventListener("message", handleWpayMessage);
    }

    function handleServerClick(value: string) {
        if (value === SERVER_TYPES.PROD) {
            showProdModal = true;
        }
    }

    function handleProdDomainClick(value: string) {
        prodDomain = value;
        showProdModal = false;
    }

    async function handleWpayMessage(event: MessageEvent) {
        if (!event.data || !event.data.resultCode) return;

        const resData = event.data;
        const keys = MERCHANT_KEYS[mid];
        if (!keys) {
            console.error("Merchant Keys not found for:", mid);
            return;
        }

        let isPinAuthResponse = !resData.userId && !resData.ci;
        let responseSigningOrder = isPinAuthResponse
            ? ["resultCode", "resultMsg", "mid", "wtid", "wpayUserKey"]
            : [
                  "resultCode",
                  "resultMsg",
                  "mid",
                  "wtid",
                  "userId",
                  "wpayUserKey",
                  "ci",
              ];

        if (resData.signature) {
            const { signature: calculatedSignature } = await generateSignature(
                resData,
                keys.hashKey,
                responseSigningOrder,
            );

            if (calculatedSignature !== resData.signature) {
                alert("WPAY Response Signature Verification Failed!");
                if (wpayPopup) wpayPopup.close();
                window.removeEventListener("message", handleWpayMessage);
                return;
            }
        }

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
        const ci = resData.ci ? decrypt(resData.ci) : "";
        const resUserId = resData.userId ? decrypt(resData.userId) : "";
        const isSuccessCode =
            resData.resultCode === "0000" || resData.resultCode === "2006";

        const cleanup = () => {
            if (wpayPopup) wpayPopup.close();
            window.removeEventListener("message", handleWpayMessage);
        };

        if (isPinAuthResponse) {
            isWpaySuccess =
                isSuccessCode && !!wtid && !!wpayUserKey && !!resData.signature;

            if (isWpaySuccess) {
                validationError = "";
                cleanup();
                handleAccessTokenCreation();
                return;
            }

            validationError = `${resultMsg} (${resData.resultCode})`;
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

            wpayResultTitle = "WPAY PIN Auth Result";
            wpayResultButtonText = "Close";
            modalNextAction = "CLOSE";

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

                cleanup();
                handleAccessTokenCreation();
                return;
            }

            if (!isUserIdMatch) {
                validationError = `사용자 ID 불일치 (요청: ${currentUserId}, 응답: ${resUserId})`;
            } else {
                validationError = `${resultMsg} (${resData.resultCode})`;
            }

            // Signup Result Props - Failure
            wpayResultTitle = "WPAY Member Sign-up Result";
            wpayResultButtonText = "Close";
            modalNextAction = "CLOSE";

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

        cleanup();
        showResultModal = true;
    }

    async function handleAccessTokenCreation() {
        const wpayUserKeyItem = wpayResultData.find(
            (d) => d.key === "wpayUserKey",
        );
        const wtidItem = wpayResultData.find((d) => d.key === "wtid");
        const userIdItem = wpayResultData.find((d) => d.key === "userId");

        const wpayUserKey = wpayUserKeyItem?.decrypted || "";
        const wtid = wtidItem?.decrypted || wtidItem?.encrypted || "";
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

            // Randomly select an avatar
            const randomAvatar =
                AVATARS[Math.floor(Math.random() * AVATARS.length)];

            // Save avatar to localStorage for Dashboard display
            try {
                const stored = localStorage.getItem("sign-in-page");
                let cacheData = stored ? JSON.parse(stored) : {};
                cacheData.avatarUrl = randomAvatar;
                localStorage.setItem("sign-in-page", JSON.stringify(cacheData));
            } catch (e) {
                console.error("Failed to save avatar to localStorage", e);
            }

            setCookie("accessToken", token, 1);
            if (isModal && onComplete) {
                onComplete();
            } else {
                goto("/");
            }
        } catch (e) {
            console.error("Token creation failed", e);
            alert("로그인 토큰 생성 실패");
        }
    }

    function handleResultConfirm() {
        showResultModal = false;

        switch (modalNextAction) {
            case "STEP2":
                handlePinAuth();
                break;
            case "SIGNUP":
                openWpaySignup();
                break;
            case "ACCESSTOKEN":
                handleAccessTokenCreation();
                break;
            case "CLOSE":
            default:
                // Just close (already done above), and ensure cleanup if needed (for failure cases)
                if (!isWpaySuccess && modalNextAction === "CLOSE") {
                    // Cleanup wpayUserKey or other data if needed
                    // Previous logic had this check, handled via isWpaySuccess check
                    try {
                        const stored = localStorage.getItem("sign-in-page");
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            // If it was a failure that requires cleanup (like PIN Auth fail)
                            // Note: Membership check fail doesn't store wpayUserKey anyway.
                            // Pin Auth fail removes it. Signup fail doesn't add it.
                            // So mostly for Pin Auth fail logic which might have pre-existing key.
                            // But actually, update logic in message handler already removes/adds keys.
                            // So here we might not need extra cleanup unless explicit requirement.
                            // Re-reading code: handleWpayMessage for PinAuth removes key on failure.
                            // So cleanup is already done there.
                            // Only strictly need to ensure we don't proceed.
                        }
                    } catch (e) {}
                }
                break;
        }
    }

    function handleResultClose() {
        // Step 1: "X" closes modal. Confirm/Signup does action.
        // Step 2 & Signup: "X" same as Confirm (Action or Close).
        // Check current context via action or title?
        // Simplest: If Step 1 (Action is STEP2 or SIGNUP), Close = Close.
        // Else (Step 2/Signup, Action ACCESSTOKEN or CLOSE), Close = Confirm.

        if (modalNextAction === "STEP2" || modalNextAction === "SIGNUP") {
            showResultModal = false;
        } else {
            handleResultConfirm();
        }
    }

    function handleNextClick() {
        // Validation
        if (!mid || !site || !service || !server) {
            alert(
                "Please fill all required fields (Service, Site, MID, Server).",
            );
            return;
        }

        // Default userId
        if (!userId) {
            userId = "wpayTestUser01";
        }

        // Save to LocalStorage
        const cacheData = {
            service,
            server,
            prodDomain,
            site,
            mid,
            userId: userId,
            hNum,
            isSaveCache,
        };
        localStorage.setItem("sign-in-page", JSON.stringify(cacheData));

        // Branching logic
        if (!hNum) {
            openWpaySignup();
        } else {
            handleMembershipCheck();
        }
    }

    async function handleMembershipCheck() {
        // Validation (Double check or rely on handleNextClick if called from there)
        // Keeping basic checks for safety if called independently or refactored later
        if (!mid || !site || !service || !server) return;

        const keys = MERCHANT_KEYS[mid];
        if (!keys) {
            alert("Configuration not found for Merchant ID.");
            return;
        }

        let domain = "";
        if (server === SERVER_TYPES.PROD) {
            if (!prodDomain) {
                alert("PROD Server type must be selected.");
                showProdModal = true;
                return;
            }
            domain =
                SERVICE_URLS["wpaystd"].PROD[prodDomain as ProdServerDomain];
        } else {
            domain = SERVICE_URLS["wpaystd"][server as "DEV" | "STG"];
        }

        // ... (rest of logic uses state variables directly)

        const params: MembershipSearchParams = {
            domain,
            siteName: site,
            merchantId: mid,
            userId: userId || "wpayTestUser01",
            hNum: hNum,
        };

        // ... (rest of function)

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
            const currentUserId = userId || "wpayTestUser01";

            const isSuccess =
                resData.resultCode === "0000" &&
                !!resData.wpayUserKey &&
                !!resData.userId &&
                resUserId === currentUserId &&
                resData.status === "00" &&
                !!resData.ci;

            isWpaySuccess = isSuccess;

            if (isSuccess && wpayUserKey) {
                try {
                    // Save Cache if checked (keep existing logic)
                    if (isSaveCache) {
                        const cacheData = {
                            service,
                            server,
                            prodDomain,
                            site,
                            mid,
                            userId,
                            hNum,
                            isSaveCache,
                            wpayUserKey,
                        };
                        localStorage.setItem(
                            "sign-in-page",
                            JSON.stringify(cacheData),
                        );
                    } else {
                        // Update wpayUserKey in existing cache if exists
                        const stored = localStorage.getItem("sign-in-page");
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            parsed.wpayUserKey = wpayUserKey;
                            localStorage.setItem(
                                "sign-in-page",
                                JSON.stringify(parsed),
                            );
                        }
                    }
                } catch (e) {}

                // Auto-proceed to Step 2
                handlePinAuth();
                return;
            } else {
                wpayResultTitle = "WPAY Member Auth Result";

                // If checking membership failed (e.g. user not found), we prompt to Signup
                wpayResultButtonText = "Signup";
                modalNextAction = "SIGNUP";

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
            }
        } catch (e) {
            console.error("Membership Check Failed", e);
            alert(
                "회원 조회 중 오류가 발생했습니다: " +
                    (e instanceof Error ? e.message : String(e)),
            );
        }
    }

    async function openWpaySignup() {
        if (!mid || !site) {
            alert("Merchant ID and Site must be selected.");
            return;
        }
        const keys = MERCHANT_KEYS[mid];
        if (!keys) return;

        let domain = "";
        if (server === SERVER_TYPES.PROD) {
            domain =
                SERVICE_URLS[service as ServiceType].PROD[
                    prodDomain as ProdServerDomain
                ];
        } else {
            domain =
                SERVICE_URLS[service as ServiceType][server as "DEV" | "STG"];
        }

        wpayFormAction = `${domain}/${site}/std/u/v1/memreg`;
        const returnUrl =
            window.location.origin + `/callback/wpaystd2/${site}/memreg`;

        const encrypt = (value: string) =>
            value ? encryptSeed(value, keys.seedKey, keys.seedIV) : "";
        const getStored = (key: string) => localStorage.getItem(key) || "";

        const finalMid = mid || getStored("mid");
        const finalUserId = userId || getStored("userId") || "wpayTestUser01";
        const finalHNum = getStored("hNum") || hNum;

        const rawCi = getStored("ci");
        const rawUserNm = getStored("userNm");
        const rawHCorp = getStored("hCorp");
        const rawBirthDay = getStored("birthDay");
        const rawSocialNo2 = getStored("socialNo2");
        const rawFrnrYn = getStored("frnrYn");

        const reqData: Record<string, string> = {
            mid: finalMid,
            userId: encrypt(finalUserId),
            ci: encrypt(rawCi),
            userNm: encodeURIComponent(rawUserNm),
            hNum: encrypt(finalHNum),
            hCorp: rawHCorp,
            birthDay: encrypt(rawBirthDay),
            socialNo2: rawSocialNo2,
            frnrYn: rawFrnrYn,
            returnUrl: encodeURIComponent(returnUrl),
            agreePayNm: "",
            agreeUrl: "",
            optReadOnly: "",
        };

        const { signature } = await generateSignature(reqData, keys.hashKey);
        reqData.signature = signature;
        wpayFormData = reqData;

        await tick();
        startWpaySignup();

        setTimeout(() => {
            const form = document.getElementById(
                "wpay-signup-form",
            ) as HTMLFormElement;
            if (form) form.submit();
        }, 100);
    }

    async function handlePinAuth() {
        if (!mid || !site) return;
        const keys = MERCHANT_KEYS[mid];
        if (!keys) return;

        let domain = "";
        if (server === SERVER_TYPES.PROD) {
            domain =
                SERVICE_URLS[service as ServiceType].PROD[
                    prodDomain as ProdServerDomain
                ];
        } else {
            domain =
                SERVICE_URLS[service as ServiceType][server as "DEV" | "STG"];
        }

        if (service === "wpaystd2") {
            wpayFormAction = `${domain}/${site}/std/u/v1/pinno/auth`;
        } else {
            wpayFormAction = `${domain}/${site}/std/u/v1/pin/auth`;
        }

        const returnPath = service === "wpaystd2" ? "pinno/auth" : "pin_auth";
        const returnUrl =
            window.location.origin + `/callback/wpaystd2/${site}/${returnPath}`;

        const encrypt = (value: string) =>
            value ? encryptSeed(value, keys.seedKey, keys.seedIV) : "";
        // Need wpayUserKey from result or cache
        const wpayUserKeyItem = wpayResultData.find(
            (d) => d.key === "wpayUserKey",
        );
        let wpayUserKey = wpayUserKeyItem?.decrypted || "";

        if (!wpayUserKey) {
            try {
                const stored = localStorage.getItem("sign-in-page");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.wpayUserKey) {
                        wpayUserKey = parsed.wpayUserKey;
                    }
                }
            } catch (e) {
                console.error("Failed to read wpayUserKey from storage", e);
            }
        }

        // Check if wpayUserKey exists (from Step 1)
        // If not found, we should probably fail or prompt signup, but based on prompt this case triggers failure modal.
        // However, if we just came from Step 1, we might treat it as "Membership Info" found but "User Key" missing
        // which conceptually matches "Not Signed Up".

        // Actually, logic says: "WPAY PIN Auth 실패인 경우: ... WPAY Result Fail View Modal을 오픈 한다."
        // Missing key prevents even starting PIN Auth.
        // So we should treat this as a failure state.

        if (!wpayUserKey) {
            // Treat as failure
            wpayResultTitle = "WPAY PIN Auth Result";
            wpayResultButtonText = "Close";
            modalNextAction = "CLOSE";

            // Construct a local failure response
            const failData = {
                resultCode: "9999",
                resultMsg: "WPAY User Key not found. Please Sign up first.",
                mid: mid || "",
                wtid: "",
                wpayUserKey: "",
                signature: "",
            };

            wpayResultData = [
                {
                    key: "resultCode",
                    label: "결과 코드",
                    encrypted: "",
                    decrypted: failData.resultCode,
                },
                {
                    key: "resultMsg",
                    label: "결과 메시지",
                    encrypted: "",
                    decrypted: failData.resultMsg,
                },
            ];

            showResultModal = true;
            return;
        }

        const finalUserId = userId || "wpayTestUser01";

        const reqData: Record<string, string> = {
            mid: mid,
            wpayUserKey: encrypt(wpayUserKey),
            ci: encrypt(""), // ci is empty for pin auth usually unless specified
            userId: encrypt(finalUserId),
            returnUrl: encodeURIComponent(returnUrl),
        };

        const pinAuthSigningOrder = ["mid", "wpayUserKey", "ci", "returnUrl"];
        const { signature } = await generateSignature(
            reqData,
            keys.hashKey,
            pinAuthSigningOrder,
        );
        reqData.signature = signature;
        wpayFormData = reqData;

        await tick();
        startWpaySignup();

        setTimeout(() => {
            const form = document.getElementById(
                "wpay-signup-form",
            ) as HTMLFormElement;
            if (form) form.submit();
        }, 100);
    }

    function confirmProdModal() {
        showProdModal = false;
        // Optionally save current selection to cache if 'saved' was true
        // But logic is mainly triggered on 'Next'
    }
</script>

<div
    class="w-full max-w-[520px] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden"
>
    <div class="px-8 pt-8 pb-4">
        <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
            Sign In
        </h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configure your environment to proceed.
        </p>

        <button
            type="button"
            class="mt-4 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
            onclick={() => (isConfigVisible = !isConfigVisible)}
        >
            <span class="material-symbols-outlined text-[16px]">
                {isConfigVisible ? "expand_less" : "expand_more"}
            </span>
            {isConfigVisible ? "Hide Configuration" : "Show Configuration"}
        </button>
    </div>
    <form class="px-8 pb-8 space-y-6">
        {#if isConfigVisible}
            <div
                class="space-y-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700/50"
            >
                <div class="space-y-1.5">
                    <span
                        class="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                        >Server Environment {prodDomain
                            ? `(${prodDomain})`
                            : ""}</span
                    >
                    <RadioGroup
                        options={serverRadioOptions}
                        groupName="server"
                        bind:selected={server}
                        variant="box"
                        direction="grid"
                        cols={3}
                        isError={!server && highlightMissing}
                        onOptionClick={handleServerClick}
                        disabled={true}
                    />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1.5 col-span-1 sm:col-span-2">
                        <label
                            class="text-sm font-medium text-slate-700 dark:text-slate-300"
                            for="service-input">Service</label
                        >
                        <DropdownInput
                            id="service-input"
                            options={serviceOptions}
                            bind:value={service}
                            placeholder="Select a Service"
                            isError={!service && highlightMissing}
                            disabled={true}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <label
                            class="text-sm font-medium text-slate-700 dark:text-slate-300"
                            for="site-input">Site</label
                        >
                        <DropdownInput
                            id="site-input"
                            options={siteOptions}
                            bind:value={site}
                            placeholder="Select Site"
                            isError={!site && highlightMissing}
                            disabled={true}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <label
                            class="text-sm font-medium text-slate-700 dark:text-slate-300"
                            for="mid-input">Merchant ID</label
                        >
                        <DropdownInput
                            id="mid-input"
                            options={merchantIdOptions}
                            bind:value={mid}
                            placeholder="Select MID"
                            isError={!mid && highlightMissing}
                            disabled={true}
                        />
                    </div>
                </div>
            </div>
        {/if}
        <hr class="border-slate-100 dark:border-slate-700" />
        <div class="space-y-4">
            <div class="space-y-1.5">
                <label
                    class="text-sm font-medium text-slate-700 dark:text-slate-300"
                    for="user-id-input">Member ID</label
                >
                <div class="relative group">
                    <span
                        class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >badge</span
                        >
                    </span>
                    <input
                        id="user-id-input"
                        class="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-shadow"
                        placeholder="wpayTestUser01"
                        type="text"
                        bind:value={userId}
                    />
                </div>
            </div>
            <div class="space-y-1.5">
                <label
                    class="text-sm font-medium text-slate-700 dark:text-slate-300"
                    for="phone-input">Cell Phone Number</label
                >
                <div class="relative group">
                    <span
                        class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >smartphone</span
                        >
                    </span>
                    <input
                        id="phone-input"
                        class="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-shadow"
                        placeholder="Please enter numbers only"
                        type="tel"
                        value={hNum}
                        oninput={handlePhoneInput}
                    />
                </div>
            </div>
        </div>
        <div class="pt-2">
            <label class="flex items-center gap-2.5 cursor-pointer mb-6 group">
                <div class="relative flex items-center">
                    <input
                        class="peer size-5 appearance-none rounded border border-slate-300 dark:border-slate-600 bg-white checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all"
                        type="checkbox"
                        bind:checked={isSaveCache}
                    />
                    <span
                        class="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-sm left-0.5"
                        >check</span
                    >
                </div>
                <span
                    class="text-sm text-slate-600 dark:text-slate-400 select-none group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors"
                    >Should I save to cache?</span
                >
            </label>
            <button
                class={`w-full h-12 font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all group relative cursor-pointer
                    ${
                        isFormValid
                            ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow focus:ring-blue-600"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    }
                `}
                type="button"
                onclick={handleNextClick}
                disabled={!isFormValid}
                onmouseenter={() => (highlightMissing = true)}
                onmouseleave={() => (highlightMissing = false)}
                ontouchstart={() => {
                    highlightMissing = true;
                    setTimeout(() => (highlightMissing = false), 2000);
                }}
            >
                Next
                <span
                    class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 transition-opacity pointer-events-none"
                >
                    Please fill all required fields
                </span>
            </button>
        </div>
    </form>
</div>

<!-- Hidden Form for WPAY -->
<form
    id="wpay-signup-form"
    method="POST"
    action={wpayFormAction}
    target="wpay-popup"
    class="hidden"
>
    {#each Object.entries(wpayFormData) as [name, value]}
        <input type="hidden" {name} {value} />
    {/each}
</form>

<!-- PROD Domain Modal -->
{#if showProdModal}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity opacity-100"
    >
        <div
            class="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden transform transition-all scale-100"
        >
            <div
                class="p-6 bg-white dark:bg-slate-800 flex justify-between items-center border-b border-slate-100 dark:border-slate-700"
            >
                <h3
                    class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"
                >
                    WPAY Production Domain
                </h3>
                <button
                    class="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    onclick={() => (showProdModal = false)}
                >
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-6 space-y-4">
                <div class="space-y-3">
                    <div class="grid grid-cols-1 gap-3">
                        <RadioGroup
                            options={prodDomainRadioOptions}
                            groupName="prodDomain"
                            bind:selected={prodDomain}
                            variant="box"
                            direction="column"
                            size="lg"
                            onOptionClick={handleProdDomainClick}
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Result Modal -->
{#if showResultModal}
    <WpayResultModal
        data={wpayResultData}
        onConfirm={handleResultConfirm}
        onClose={handleResultClose}
        title={wpayResultTitle}
        buttonText={wpayResultButtonText}
    />
{/if}
