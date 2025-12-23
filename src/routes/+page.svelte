<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { validateAuthToken } from "$lib/utils/auth/authToken";
    import { decodeJwt } from "jose";

    let isValid = $state(false);

    onMount(async () => {
        const authToken = localStorage.getItem("authToken");

        if (!authToken) {
            goto("/login");
            return;
        }

        try {
            // Decode token to get mid (unverified first)
            const payload = decodeJwt(authToken);
            const mid = payload.mid as string;

            if (!mid) {
                console.error("No mid in token");
                localStorage.removeItem("authToken");
                goto("/login");
                return;
            }

            const valid = await validateAuthToken(authToken, mid);
            if (!valid) {
                // Invalid token, clear and redirect
                localStorage.removeItem("authToken");
                goto("/login");
                return;
            }

            isValid = true;
        } catch (e) {
            console.error("Token decode/validation failed", e);
            localStorage.removeItem("authToken");
            goto("/login");
        }
    });

    function handleLogout() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("mid");
        // Clear other keys if necessary or keep them for 'remember me' logic?
        // For logout usually we clear auth state.
        goto("/login");
    }
</script>

{#if isValid}
    <div
        class="min-h-screen flex flex-col items-center justify-center bg-gray-50"
    >
        <h1 class="text-4xl font-bold text-blue-600 mb-4">메인 페이지</h1>
        <p class="text-xl text-gray-600">로그인에 성공하셨습니다!</p>
        <p class="mt-2 text-sm text-gray-400">JWT Token Validated</p>

        <button
            onclick={handleLogout}
            class="mt-8 px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
            로그아웃
        </button>
    </div>
{:else}
    <div
        class="min-h-screen flex flex-col items-center justify-center bg-gray-50"
    >
        <p>인증 확인 중...</p>
    </div>
{/if}
