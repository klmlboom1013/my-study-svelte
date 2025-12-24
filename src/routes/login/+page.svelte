<script lang="ts">
    import LoginForm from "$lib/features/auth/LoginForm.svelte";
</script>

<div
    class="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
>
    <div class="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <!-- Optional: Logo Icon could go here -->
        <!-- <img class="mx-auto h-12 w-auto" src="/logo.png" alt="Logo"> -->
        <h2
            class="text-center text-2xl font-normal text-gray-900 tracking-tight"
        >
            Sign in to WPAY
        </h2>
    </div>

    <div
        class="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-200"
    >
        <LoginForm />
    </div>

    <!-- Optional: Footer/Links could go below -->
</div>
