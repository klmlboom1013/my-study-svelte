<script lang="ts">
    import LoginForm from "$lib/features/auth/LoginForm.svelte";
</script>

<div
    class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
>
    <div
        class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100"
    >
        <div class="text-center">
            <h2 class="mt-6 text-3xl font-extrabold text-gray-900">로그인</h2>
        </div>

        <LoginForm />
    </div>
</div>
