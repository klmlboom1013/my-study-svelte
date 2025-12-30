<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { validateAccessToken } from "$lib/utils/auth/accessToken";
    import { deleteCookie, getCookie } from "$lib/utils/cookie";
    import { decodeJwt } from "jose";

    let isValid = $state(false);

    onMount(async () => {
        const accessToken = getCookie("accessToken");

        if (!accessToken) {
            goto("/signin");
            return;
        }

        try {
            // Decode token to get mid (unverified first)
            const payload = decodeJwt(accessToken);
            const mid = payload.mid as string;

            if (!mid) {
                console.error("No mid in token");
                deleteCookie("accessToken");
                goto("/signin");
                return;
            }

            const valid = await validateAccessToken(accessToken, mid);
            if (!valid) {
                // Invalid token, clear and redirect
                deleteCookie("accessToken");
                goto("/signin");
                return;
            }

            isValid = true;
        } catch (e) {
            console.error("Token decode/validation failed", e);
            deleteCookie("accessToken");
            goto("/signin");
        }
    });

    function handleLogout() {
        deleteCookie("accessToken");

        // Cleanup Input Info if isSaveCache is not true
        const storedData = localStorage.getItem("sign-in-page");
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                if (!parsedData.isSaveCache) {
                    localStorage.removeItem("sign-in-page");
                }
            } catch (e) {
                console.error("Failed to parse sign-in-page data", e);
            }
        }

        goto("/signin");
    }
</script>

{#if isValid}
    <div class="flex flex-col items-center">
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
    <p>인증 확인 중...</p>
{/if}
