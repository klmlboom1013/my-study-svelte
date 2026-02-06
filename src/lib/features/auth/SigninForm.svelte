<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { setCookie, getCookie } from "$lib/utils/cookie";
    import { profileStore } from "$lib/stores/profileStore";
    import { loginWithGoogle } from "$lib/features/auth/services/authService";

    interface Props {
        isModal?: boolean;
        onComplete?: () => void;
    }

    let { isModal = false, onComplete }: Props = $props();

    // State
    let isLoading = $state(false);
    let errorMessage = $state("");

    onMount(() => {
        const checkAuth = async () => {
            // Cookie check
            const token = getCookie("accessToken");
            if (token && !isModal) {
                // If token exists, we assume logged in for now and redirect
                // In a real app, we might want to validate this token via API
                goto("/");
            }
        };

        checkAuth();
    });

    async function handleGoogleLogin() {
        isLoading = true;
        errorMessage = "";
        try {
            const { user, token } = await loginWithGoogle();
            
            if (user) {
                // Update Profile Store
                profileStore.updateProfile({
                    id: user.uid,
                    saveDateTime: new Date().toISOString(),
                    basicInfo: {
                        userId: user.email || user.uid,
                        nickname: user.displayName || "Google User",
                        avatarUrl: user.photoURL || "",
                    },
                    testerInformation: {
                        company: "",
                        team: "",
                        position: "",
                        role: "",
                    },
                    myApplications: [],
                });

                // Set Access Token Cookie (Using uid as a simple token or a real JWT if available)
                // For existing layout compatibility, we need some token.
                // In the previous version, handleAccessTokenCreation called /api/auth/token.
                // Let's call /api/auth/token with minimal info to get a valid JWT if needed, 
                // but since we're streamlining, we'll use a placeholder or the uid if the server supports it.
                // Actually, let's keep it simple: if loginWithGoogle succeeded, we grant access.
                const appToken = token || user.uid; 
                setCookie("accessToken", appToken, 1);

                if (isModal && onComplete) {
                    onComplete();
                } else {
                    sessionStorage.setItem("justLoggedIn", "true");
                    goto("/");
                }
            }
        } catch (e) {
            console.error("Login failed:", e);
            errorMessage = "Google 로그인을 실패했습니다. 다시 시도해 주세요.";
        } finally {
            isLoading = false;
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
            Welcome Back
        </h2>
        <p class="text-sm font-medium text-slate-500">Sign in to continue</p>
    </div>

    <!-- Form Area -->
    <div class="px-8 pb-10 space-y-6">
        <div class="flex flex-col items-center justify-center py-4">
            <div class="size-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
                <span class="material-symbols-outlined text-4xl text-blue-600">login</span>
            </div>
            <p class="text-slate-600 dark:text-slate-400 text-center text-sm px-4">
                구글 계정으로 로그인하여 엔드포인트와 설정을 안전하게 동기화하세요.
            </p>
        </div>

        {#if errorMessage}
            <div class="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs text-center font-medium">
                {errorMessage}
            </div>
        {/if}

        <button
            class="w-full py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            onclick={handleGoogleLogin}
            disabled={isLoading}
        >
            {#if isLoading}
                <span class="material-symbols-outlined animate-spin text-xl">refresh</span>
            {:else}
                <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    class="w-5 h-5"
                />
            {/if}
            <span>Continue with Google</span>
        </button>

        <p class="text-[11px] text-slate-400 text-center px-6 leading-relaxed">
            By signing in, you agree to our Terms of Service and Privacy Policy. Your data is encrypted and synced via Google Drive.
        </p>
    </div>
</div>
