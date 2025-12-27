<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { validateAccessToken } from "$lib/utils/auth/accessToken";
    import { deleteCookie, getCookie } from "$lib/utils/cookie";
    import { decodeJwt } from "jose";

    let isValid = $state(false);

    onMount(async () => {
        // Cleanup Input Info if isSaveCache is not true (Prompt 3.1 Requirement)
        const isSaveCache = localStorage.getItem("isSaveCache");
        if (isSaveCache !== "true") {
            const keysToRemove = [
                "service",
                "server",
                "prodDomain",
                "site",
                "mid",
                "userId",
                "hNum",
                "isSaveCache",
            ];
            keysToRemove.forEach((key) => localStorage.removeItem(key));
        }

        const accessToken = getCookie("accessToken");

        if (!accessToken) {
            goto("/login");
            return;
        }

        try {
            // Decode token to get mid (unverified first)
            const payload = decodeJwt(accessToken);
            const mid = payload.mid as string;

            if (!mid) {
                console.error("No mid in token");
                deleteCookie("accessToken");
                goto("/login");
                return;
            }

            const valid = await validateAccessToken(accessToken, mid);
            if (!valid) {
                // Invalid token, clear and redirect
                deleteCookie("accessToken");
                goto("/login");
                return;
            }

            isValid = true;
        } catch (e) {
            console.error("Token decode/validation failed", e);
            deleteCookie("accessToken");
            goto("/login");
        }
    });

    function handleLogout() {
        deleteCookie("accessToken");
        // mid Removal Logic Removed:
        // isSave=true: mid should persist.
        // isSave=false: mid is already cleared onMount.
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
