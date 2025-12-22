<script>
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    onMount(() => {
        const wpayUserKey = localStorage.getItem("wpayUserKey");
        const wtid = localStorage.getItem("wtid");
        const loginUserId = localStorage.getItem("loginUserId");

        if (!wpayUserKey || !wtid || !loginUserId) {
            goto("/login");
        }
    });
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gray-50">
    <h1 class="text-4xl font-bold text-blue-600 mb-4">메인 페이지</h1>
    <p class="text-xl text-gray-600">로그인에 성공하셨습니다!</p>

    <a
        href="/login"
        class="mt-8 px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
    >
        로그인 페이지로 돌아가기
    </a>
</div>
