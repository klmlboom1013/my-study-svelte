<script lang="ts">
    import {
        authStore,
        loginWithGoogle,
        logout,
    } from "$lib/services/authService";

    let isLoading = false;
    let error = "";

    const handleLogin = async () => {
        isLoading = true;
        error = "";
        try {
            await loginWithGoogle();
        } catch (e) {
            error = "Login failed";
            console.error(e);
        } finally {
            isLoading = false;
        }
    };

    const handleLogout = async () => {
        isLoading = true;
        try {
            await logout();
        } finally {
            isLoading = false;
        }
    };
</script>

<div class="flex items-center gap-2">
    {#if error}
        <span class="text-xs text-red-500 hidden md:inline">{error}</span>
    {/if}

    {#if $authStore.firebaseUser}
        <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
                {#if $authStore.firebaseUser.photoURL}
                    <img
                        src={$authStore.firebaseUser.photoURL}
                        alt="Profile"
                        class="w-8 h-8 rounded-full border border-slate-200 dark:border-border-dark"
                    />
                {/if}
                <div class="hidden md:flex flex-col text-right">
                    <span
                        class="text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                        {$authStore.firebaseUser.displayName}
                    </span>
                    <span
                        class="text-[10px] text-slate-500 dark:text-slate-400"
                    >
                        {$authStore.accessToken ? "Synced" : "Offline"}
                    </span>
                </div>
            </div>
            <button
                onclick={handleLogout}
                disabled={isLoading}
                class="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1"
            >
                Start Over
            </button>
        </div>
    {:else}
        <button
            onclick={handleLogin}
            disabled={isLoading}
            class="flex items-center gap-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shadow-sm"
        >
            {#if isLoading}
                <span class="material-symbols-outlined text-[18px] animate-spin"
                    >refresh</span
                >
            {:else}
                <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    class="w-4 h-4"
                />
            {/if}
            <span>Login</span>
        </button>
    {/if}
</div>
