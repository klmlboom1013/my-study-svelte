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
    import {
        SERVER_TYPES,
        PROD_SERVER_DOMAINS,
        SERVICE_OPTIONS,
        MERCHANT_ID_OPTIONS,
        SERVICE_SITE_MAPPING,
        SITE_MERCHANT_ID_MAPPING,
        type ServerType,
        type ServiceType,
        type ProdServerDomain,
    } from "$lib/constants/wpayServerType";
    import { MERCHANT_KEYS } from "$lib/utils/encryption/cryptoKeys";
    import { generateSignature } from "$lib/utils/wpay/signature";
    import { encryptSeed, decryptSeed } from "$lib/utils/encryption/cryptoSeed";
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
    let service = $state("");
    // @ts-ignore
    let server = $state<ServerType>("");
    let prodDomain = $state(""); // Default to empty
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
                    service = parsedData.service || "";
                    server = (parsedData.server as ServerType) || "";
                    prodDomain = parsedData.prodDomain || "";
                    site = parsedData.site || "";
                    mid = parsedData.mid || "";
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
                if (isValid) {
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

        window.removeEventListener("message", handleWpayMessage);
        window.addEventListener("message", handleWpayMessage);
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

        if (isPinAuthResponse) {
            isWpaySuccess =
                isSuccessCode && !!wtid && !!wpayUserKey && !!resData.signature;

            if (!isWpaySuccess) {
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
            } else {
                validationError = "";
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

        if (wpayPopup) wpayPopup.close();
        window.removeEventListener("message", handleWpayMessage);
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

            setCookie("accessToken", token, 1);
            goto("/");
        } catch (e) {
            console.error("Token creation failed", e);
            alert("로그인 토큰 생성 실패");
        }
    }

    function handleResultConfirm() {
        showResultModal = false;
        if (isWpaySuccess) {
            const isMembershipCheck = wpayResultData.some(
                (d) => d.key === "status",
            );
            if (isMembershipCheck) {
                handlePinAuth();
            } else {
                handleAccessTokenCreation();
            }
        } else {
            // Failure case: remove wpayUserKey from localStorage if exists
            try {
                const stored = localStorage.getItem("sign-in-page");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.wpayUserKey) {
                        delete parsed.wpayUserKey;
                        localStorage.setItem(
                            "sign-in-page",
                            JSON.stringify(parsed),
                        );
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    }

    function handleResultClose() {
        handleResultConfirm();
    }

    async function handleMembershipCheck() {
        // userId Check
        if (!userId) {
            userId = "wpayTestUser01";
        }

        if (!mid || !site || !service || !server) {
            alert(
                "Please fill all required fields (Service, Site, MID, Server).",
            );
            return;
        }

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

        // Save to LocalStorage if isSaveCache is checked
        const cacheData = {
            service,
            server,
            prodDomain,
            site,
            mid,
            userId: userId || "wpayTestUser01",
            hNum,
            isSaveCache,
        };
        localStorage.setItem("sign-in-page", JSON.stringify(cacheData));

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
                    // Save Cache if checked
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
            // If User not found or error, prompt signup
            // In prompt 4 (based on history), flow might be Check -> if fail -> Signup?
            // But existing code just alerts. Let's start with alert, or follow user preference.
            // Assuming user wants to see result modal every time as per previous code.
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
        const wpayUserKey = wpayUserKeyItem?.decrypted || "";

        if (!wpayUserKey) {
            alert("WPAY User Key not found. Please Sign up first.");
            // openWpaySignup(); // Optional auto-redirect
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
    </div>
    <form class="px-8 pb-8 space-y-6">
        <div class="space-y-3">
            <span
                class="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >Server Environment {prodDomain ? `(${prodDomain})` : ""}</span
            >
            <RadioGroup
                options={serverRadioOptions}
                groupName="server"
                bind:selected={server}
                variant="box"
                direction="grid"
                cols={3}
                isError={!server && highlightMissing}
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
                />
            </div>
        </div>
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
                        class="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
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
                        class="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow"
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
                        class="peer size-5 appearance-none rounded border border-slate-300 dark:border-slate-600 bg-white checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
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
                            ? "bg-primary hover:bg-blue-700 text-white hover:shadow focus:ring-primary"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    }
                `}
                type="button"
                onclick={handleMembershipCheck}
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
                class="p-6 bg-primary dark:bg-slate-800 flex justify-between items-center"
            >
                <h3
                    class="text-lg font-bold text-white flex items-center gap-2"
                >
                    WPAY Production Domain
                </h3>
                <button
                    class="text-white/70 hover:text-white transition-colors cursor-pointer"
                    onclick={() => (showProdModal = false)}
                >
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-6 space-y-4">
                <div class="space-y-3">
                    <span
                        class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >PROD Domain</span
                    >
                    <div class="grid grid-cols-1 gap-3">
                        <RadioGroup
                            options={prodDomainRadioOptions}
                            groupName="prodDomain"
                            bind:selected={prodDomain}
                            variant="box"
                            direction="column"
                        />
                    </div>
                </div>
            </div>
            <div
                class="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700"
            >
                <button
                    class="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-blue-700 shadow-sm cursor-pointer"
                    onclick={confirmProdModal}
                >
                    Confirm
                </button>
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
    />
{/if}
