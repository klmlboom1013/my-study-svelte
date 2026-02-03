<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { goto } from "$app/navigation";
    // import { createAccessToken, validateAccessToken } from "$lib/utils/auth/accessToken"; // Removed. used API.
    import { setCookie, getCookie } from "$lib/utils/cookie";
    import { profileStore } from "$lib/stores/profileStore";
    import { wpayAuthService } from "$lib/features/auth/services/wpayAuthService";
    import { WPAY_POPUP_CONFIG, WPAY_INTEGRATION } from "$lib/types/wpay";
    import { AVATARS } from "$lib/features/auth/constants/avatars";
    import { searchWpayMember } from "$lib/utils/wpay/membershipService";
    import WpayResultModal from "$lib/components/wpay/WpayResultModal.svelte";

    // Sub-components
    import AuthUserInfo from "./AuthUserInfo.svelte";

    interface Props {
        isModal?: boolean;
        onComplete?: () => void;
    }

    let { isModal = false, onComplete }: Props = $props();

    // Fixed Configuration
    // All configuration moved to WPAY_INTEGRATION constant

    // State
    let userId = $state("wpayTestUser01");
    let hNum = $state("");
    let isSaveCache = $state(false);
    let highlightMissing = $state(false);

    let showResultModal = $state(false);
    let validationError = $state("");
    let wpayResultData = $state<
        { key: string; label: string; encrypted: string; decrypted: string }[]
    >([]);
    let wpayResultTitle = $state("WPAY 요청 결과");
    let wpayResultButtonText = $state("확인");
    let modalNextAction = $state<"STEP2" | "SIGNUP" | "ACCESSTOKEN" | "CLOSE">(
        "CLOSE",
    );

    // Button is always active now
    let isFormValid = $derived(true);

    // Communications
    let authChannel: BroadcastChannel;

    onMount(() => {
        // BroadcastChannel Setup
        authChannel = new BroadcastChannel("wpay_channel");
        authChannel.onmessage = (event) =>
            handleWpayMessage({ data: event.data } as MessageEvent);

        // Storage Event Handler (Cross-tab/Window communication fallback)
        const storageHandlerRef = (event: StorageEvent) => {
            if (event.key === "wpay_auth_result" && event.newValue) {
                try {
                    handleWpayMessage({
                        data: JSON.parse(event.newValue),
                    } as MessageEvent);
                    localStorage.removeItem("wpay_auth_result");
                } catch {}
            }
        };
        window.addEventListener("storage", storageHandlerRef);

        const checkAuth = async () => {
            // Load Cache
            const stored = localStorage.getItem("sign-in-page");
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    isSaveCache = parsed.isSaveCache;
                    if (isSaveCache) {
                        userId = parsed.userId || "wpayTestUser01";
                        hNum = parsed.hNum || "";
                    }
                } catch {}
            }

            // Cookie check
            const token = getCookie("accessToken");
            if (token && WPAY_INTEGRATION.MID) {
                try {
                    const res = await fetch("/api/auth/validate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            token,
                            mid: WPAY_INTEGRATION.MID,
                        }),
                    });
                    const { isValid } = await res.json();
                    if (isValid && !isModal) goto("/");
                } catch {}
            }
        };

        checkAuth();

        return () => {
            if (authChannel) authChannel.close();
            window.removeEventListener("message", handleWpayMessage);
            window.removeEventListener("storage", storageHandlerRef);
        };
    });

    // WPAY Message Handling
    async function handleWpayMessage(event: MessageEvent) {
        console.log("Received WPAY Message:", event.data);

        let resData = event.data;
        // Extract data if wrapped in { type: "WPAY_RESULT", data: { ... } }
        if (resData?.type === "WPAY_RESULT" && resData?.data) {
            resData = resData.data;
        }

        if (resData?.source?.includes("react-devtools") || !resData?.resultCode)
            return;

        const isPinAuth = !resData.userId && !resData.ci;

        // Server-Side Verification & Decryption (Auth Dedicated)
        try {
            const res = await fetch("/api/auth/wpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resData }),
            });
            const result = await res.json();

            if (!result.isSigValid) {
                console.warn("Signature verification failed", result);
                wpayResultTitle =
                    (isPinAuth ? "WPAY PIN Auth" : "WPAY Member Signup") +
                    " Result";
                validationError = "Signature verification failed (Server)";
                modalNextAction = "CLOSE";
                wpayResultData = [
                    {
                        key: "signature",
                        label: "서명 상태",
                        encrypted: resData.signature,
                        decrypted: "INVALID (서명 불일치)",
                    },
                    {
                        key: "resultCode",
                        label: "결과 코드",
                        encrypted: resData.resultCode,
                        decrypted: "-",
                    },
                    {
                        key: "resultMsg",
                        label: "결과 메시지",
                        encrypted: resData.resultMsg,
                        decrypted: "-",
                    },
                ];
                showResultModal = true;
                return;
            }

            const decrypted = result.decrypted;
            const isSuccess =
                resData.resultCode === "0000" || resData.resultCode === "2006";

            if (isPinAuth) {
                if (isSuccess && decrypted.wpayUserKey) {
                    handleAccessTokenCreation({
                        wpayUserKey: decrypted.wpayUserKey,
                        wtid: decrypted.wtid,
                        userId,
                    });
                    return;
                }
                validationError = `${decrypted.resultMsg} (${resData.resultCode})`;
                wpayResultTitle = "WPAY PIN Auth Result";
                modalNextAction = "CLOSE";
                wpayResultData = [
                    {
                        key: "resultCode",
                        label: "결과 코드",
                        encrypted: resData.resultCode,
                        decrypted: "-",
                    },
                    {
                        key: "resultMsg",
                        label: "결과 메시지",
                        encrypted: resData.resultMsg,
                        decrypted: decrypted.resultMsg,
                    },
                    {
                        key: "wtid",
                        label: "WPAY 트랜잭션 ID",
                        encrypted: resData.wtid,
                        decrypted: decrypted.wtid,
                    },
                    {
                        key: "wpayUserKey",
                        label: "WPAY 사용자 키",
                        encrypted: resData.wpayUserKey,
                        decrypted: decrypted.wpayUserKey,
                    },
                ];
            } else {
                const isUserIdMatch =
                    decrypted.userId === (userId || "wpayTestUser01");
                if (isSuccess && isUserIdMatch) {
                    if (isSaveCache) {
                        const cache = JSON.parse(
                            localStorage.getItem("sign-in-page") || "{}",
                        );
                        cache.wpayUserKey = decrypted.wpayUserKey;
                        localStorage.setItem(
                            "sign-in-page",
                            JSON.stringify(cache),
                        );
                    }
                    handleAccessTokenCreation({
                        wpayUserKey: decrypted.wpayUserKey,
                        wtid: decrypted.wtid,
                        userId,
                    });
                    return;
                }
                validationError = isUserIdMatch
                    ? `${decrypted.resultMsg} (${decrypted.resultCode})`
                    : "User ID mismatch";
                wpayResultTitle = "WPAY Member Sign-up Result";
                modalNextAction = "CLOSE";
                wpayResultData = [
                    {
                        key: "resultCode",
                        label: "결과 코드",
                        encrypted: resData.resultCode,
                        decrypted: "-",
                    },
                    {
                        key: "resultMsg",
                        label: "결과 메시지",
                        encrypted: resData.resultMsg,
                        decrypted: decrypted.resultMsg,
                    },
                    {
                        key: "userId",
                        label: "사용자 ID",
                        encrypted: resData.userId,
                        decrypted: decrypted.userId || "",
                    },
                    {
                        key: "wpayUserKey",
                        label: "WPAY 사용자 키",
                        encrypted: resData.wpayUserKey,
                        decrypted: decrypted.wpayUserKey,
                    },
                ];
            }
            showResultModal = true;
        } catch (e) {
            alert("Verification Error: " + (e as Error).message);
        }
    }

    async function handleAccessTokenCreation(data: {
        wpayUserKey: string;
        wtid: string;
        userId: string;
    }) {
        try {
            const res = await fetch("/api/auth/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    wpayUserKey: data.wpayUserKey,
                    wtid: data.wtid,
                    userId: data.userId,
                    mid: WPAY_INTEGRATION.MID,
                }),
            });
            if (!res.ok) throw new Error("Failed to create token");

            const { token } = await res.json();

            profileStore.updateProfile({
                id: crypto.randomUUID(),
                saveDateTime: new Date().toISOString(),
                basicInfo: {
                    userId: data.userId,
                    nickname: data.userId,
                    avatarUrl:
                        AVATARS[Math.floor(Math.random() * AVATARS.length)],
                },
                testerInformation: {
                    company: "",
                    team: "",
                    position: "",
                    role: "",
                },
                myApplications: [],
            });
            setCookie("accessToken", token, 1);
            if (isModal && onComplete) onComplete();
            else {
                sessionStorage.setItem("justLoggedIn", "true");
                goto("/");
            }
        } catch {
            alert("Failed to create access token");
        }
    }

    async function handleNextClick() {
        if (!userId) userId = "wpayTestUser01";

        if (isSaveCache)
            localStorage.setItem(
                "sign-in-page",
                JSON.stringify({
                    userId,
                    hNum,
                    isSaveCache,
                }),
            );

        // If either userId or hNum is missing, proceed to Signup
        if (!userId || !hNum) openWpaySignup();
        else handleMembershipCheck();
    }

    async function handleMembershipCheck() {
        // 1. Background HTTP Check (No Popup)
        const domain = WPAY_INTEGRATION.URLS.MEMBER_SEARCH;
        console.log("Using Fixed Membership Domain:", domain);

        try {
            const resData = await searchWpayMember({
                apiUrl: WPAY_INTEGRATION.URLS.MEMBER_SEARCH,
                merchantId: WPAY_INTEGRATION.MID,
                userId: userId || "wpayTestUser01",
                hNum,
            });
            const decrypted = resData;

            if (
                resData.resultCode === "0000" &&
                decrypted.wpayUserKey &&
                resData.status === "00"
            ) {
                // 2. If Success, Open PIN Auth Popup
                console.log("WPAY Membership Check Success:", resData);
                handlePinAuth(decrypted.wpayUserKey);
            } else {
                wpayResultTitle = "WPAY Member Auth Result";
                wpayResultButtonText = "Signup";
                modalNextAction = "SIGNUP";
                wpayResultData = [
                    {
                        key: "resultCode",
                        label: "결과 코드",
                        encrypted: resData.resultCode,
                        decrypted: "-",
                    },
                    {
                        key: "resultMsg",
                        label: "결과 메시지",
                        encrypted: resData.resultMsg,
                        decrypted: decrypted.resultMsg,
                    },
                    {
                        key: "status",
                        label: "상태",
                        encrypted: resData.status || "",
                        decrypted: "-",
                    },
                ];
                showResultModal = true;
            }
        } catch (e) {
            alert("Membership check failed: " + (e as Error).message);
        }
    }

    async function openWpaySignup() {
        // Open popup immediately
        const popup = wpayAuthService.openPopup(
            WPAY_POPUP_CONFIG.WIDTH,
            WPAY_POPUP_CONFIG.HEIGHT,
        );

        if (!popup) {
            alert("Popup blocked.");
            return;
        }

        try {
            const returnUrl = encodeURIComponent(
                window.location.origin + `/callback/wpay/result`,
            );

            const res = await fetch("/api/auth/wpay/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "signup",
                    mid: WPAY_INTEGRATION.MID,
                    userId: userId || "wpayTestUser01",
                    returnUrl,
                }),
            });

            if (!res.ok) {
                popup.close();
                alert("Failed to sign request");
                return;
            }

            const payload = await res.json();
            console.log("WPAY Signup Request Payload (to Popup):", payload);

            // 2. Submit form to the updated, already-open popup
            // Note: Since we reverted wpayAuthService, we use submitForm which targets "wpay-auth-popup"
            // The popup opened above has the name "wpay-auth-popup", so this should work.
            wpayAuthService.submitForm(
                WPAY_INTEGRATION.URLS.SIGNUP,
                "POST",
                payload,
            );
            window.addEventListener("message", handleWpayMessage);
        } catch (e) {
            popup.close();
            console.error(e);
            alert("Error initializing signup");
        }
    }

    async function handlePinAuth(directWpayUserKey?: string) {
        // Open popup immediately
        const popup = wpayAuthService.openPopup(
            WPAY_POPUP_CONFIG.WIDTH,
            WPAY_POPUP_CONFIG.HEIGHT,
        );

        if (!popup) {
            alert("Popup blocked.");
            // If blocked here after async membership check, we might need a "Retry" button UI.
            return;
        }

        try {
            let wpayUserKey = directWpayUserKey;
            if (!wpayUserKey) {
                const stored = JSON.parse(
                    localStorage.getItem("sign-in-page") || "{}",
                );
                wpayUserKey = stored.wpayUserKey;
            }

            if (!wpayUserKey) {
                popup.close();
                return;
            }

            const returnUrl = encodeURIComponent(
                window.location.origin + `/callback/wpay/result`,
            );

            const res = await fetch("/api/auth/wpay/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "pin_auth",
                    mid: WPAY_INTEGRATION.MID,
                    wpayUserKey,
                    returnUrl,
                }),
            });

            if (!res.ok) {
                popup.close();
                alert("Failed to sign request");
                return;
            }

            const finalPayload = await res.json();
            console.log(
                "WPAY PIN Auth Request Payload (to Popup):",
                finalPayload,
            );

            // 2. Submit form to the pre-opened popup
            wpayAuthService.submitForm(
                WPAY_INTEGRATION.URLS.PIN_AUTH,
                "POST",
                finalPayload,
            );
            window.addEventListener("message", handleWpayMessage);
        } catch (e) {
            popup.close();
            console.error(e);
            alert("Error initializing PIN auth");
        }
    }
</script>

<div
    class="w-full max-w-md mx-auto bg-white dark:bg-slate-900 shadow-2xl rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800"
>
    <!-- Header -->
    <div class="px-8 pt-10 pb-6 text-center">
        <h2
            class="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2"
        >
            WPAY Login
        </h2>
        <p class="text-sm font-medium text-slate-500">Production Environment</p>
    </div>

    <!-- Form -->
    <div class="px-8 pb-8 space-y-6">
        <!-- Configuration UI Removed -->

        <AuthUserInfo
            bind:userId
            bind:hNum
            bind:isSaveCache
            {highlightMissing}
        />

        <button
            class="w-full py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 {isFormValid
                ? 'bg-blue-600 text-white shadow-blue-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}"
            onclick={handleNextClick}
            onmouseenter={() => (highlightMissing = true)}
            onmouseleave={() => (highlightMissing = false)}
        >
            Continue with WPAY
        </button>
    </div>
</div>

{#if showResultModal}
    <WpayResultModal
        data={wpayResultData}
        title={wpayResultTitle}
        buttonText={wpayResultButtonText}
        onConfirm={() => {
            showResultModal = false;
            if (modalNextAction === "SIGNUP") openWpaySignup();
            else if (modalNextAction === "STEP2") handlePinAuth();
        }}
        onClose={() => (showResultModal = false)}
    />
{/if}
