<script lang="ts">
    import {
        authStore,
        loginWithGoogle,
        logout as logoutGoogle,
    } from "$lib/services/authService";
    import { fade } from "svelte/transition";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { setCookie } from "$lib/utils/cookie";
    import { profileStore } from "$lib/stores/profileStore";

    // State
    let isLoading = $state(false);
    let isOpen = $state(false);
    let containerRef: HTMLDivElement;

    // App User State (Reactive from store)
    // App User State (Reactive from store)
    // Prioritize nested basicInfo, then fallback to legacy root properties
    let appUserId = $derived(
        $profileStore.basicInfo?.nickname ||
            $profileStore.basicInfo?.userId ||
            $profileStore.userId ||
            "Guest",
    );
    let avatarUrl = $derived(
        $profileStore.basicInfo?.avatarUrl || $profileStore.avatarUrl || "",
    );
    let imageLoadError = $state(false);

    // Initial load handled by profileStore.init() imported
    // We can reset image error if avatar url changes
    $effect(() => {
        if (avatarUrl) {
            imageLoadError = false;
        }
    });

    const handleGoogleLogin = async () => {
        isLoading = true;
        try {
            await loginWithGoogle();
        } catch (e) {
            console.error(e);
        } finally {
            isLoading = false;
        }
    };

    const handleGoogleLogout = async () => {
        if (!confirm("Google 계정 로그아웃을 하시겠습니까?")) return;

        isLoading = true;
        try {
            await logoutGoogle();
        } finally {
            isLoading = false;
        }
    };

    const handleAppSignOut = () => {
        // Expire access token
        setCookie("accessToken", "", -1);
        isOpen = false;
        goto("/signin");
    };

    function toggle() {
        isOpen = !isOpen;
    }

    function handleOutsideClick(event: MouseEvent) {
        if (
            isOpen &&
            containerRef &&
            !containerRef.contains(event.target as Node)
        ) {
            isOpen = false;
        }
    }
</script>

<svelte:window onclick={handleOutsideClick} />

<div class="relative" bind:this={containerRef}>
    <button
        onclick={toggle}
        class="flex items-center justify-center rounded-full size-8 hover:bg-slate-100 dark:hover:bg-border-dark transition-colors cursor-pointer overflow-hidden border border-slate-200 dark:border-border-dark"
    >
        {#if avatarUrl && !imageLoadError}
            <!-- Avatar from localStorage -->
            <img
                src={avatarUrl}
                alt="App Profile"
                class="w-full h-full object-cover"
                onerror={() => {
                    imageLoadError = true;
                }}
            />
        {:else}
            <span class="material-symbols-outlined text-[20px] text-slate-500"
                >account_circle</span
            >
        {/if}
    </button>

    {#if isOpen}
        <div
            class="absolute right-0 mt-2 w-64 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-xl shadow-xl py-2 z-50 origin-top-right overflow-hidden"
            transition:fade={{ duration: 100 }}
        >
            <!-- App User Info Section -->
            <div
                class="px-4 py-3 border-b border-slate-100 dark:border-border-dark/50 bg-slate-50/50 dark:bg-slate-800/30"
            >
                <p
                    class="text-sm font-bold text-slate-900 dark:text-white truncate"
                >
                    {appUserId}
                </p>
                <div class="flex items-center gap-1.5 mt-1">
                    <span
                        class="size-2 rounded-full {$authStore.firebaseUser
                            ? $authStore.accessToken
                                ? 'bg-green-500' // Logged in + Token
                                : 'bg-amber-500' // Logged in + No Token (Paused)
                            : 'bg-slate-300'}"
                    ></span>
                    <p class="text-xs text-slate-500 dark:text-slate-400">
                        {$authStore.firebaseUser
                            ? $authStore.accessToken
                                ? "Google Synced"
                                : "Sync Paused"
                            : "Not Synced"}
                    </p>
                </div>
            </div>

            <!-- Google Account Section -->
            <div
                class="p-2 border-b border-slate-100 dark:border-border-dark/50"
            >
                {#if $authStore.firebaseUser}
                    {#if $authStore.accessToken}
                        <!-- Google Logged In & Synced State -->
                        <button
                            onclick={handleGoogleLogout}
                            disabled={isLoading}
                            class="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group text-left"
                        >
                            <div class="relative shrink-0">
                                {#if $authStore.firebaseUser.photoURL}
                                    <img
                                        src={$authStore.firebaseUser.photoURL}
                                        alt="Google Profile"
                                        class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600"
                                    />
                                    <div
                                        class="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"
                                    >
                                        <img
                                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                            alt="G"
                                            class="w-3 h-3"
                                        />
                                    </div>
                                {:else}
                                    <div
                                        class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"
                                    >
                                        <span
                                            class="text-xs font-bold text-slate-500"
                                            >G</span
                                        >
                                    </div>
                                {/if}
                            </div>
                            <div class="min-w-0 flex-1">
                                <p
                                    class="text-xs font-medium text-slate-900 dark:text-white truncate"
                                >
                                    {$authStore.firebaseUser.displayName}
                                </p>
                                <p
                                    class="text-[10px] text-slate-500 dark:text-slate-400 truncate"
                                >
                                    {$authStore.firebaseUser.email}
                                </p>
                            </div>
                            <span
                                class="material-symbols-outlined text-[16px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                logout
                            </span>
                        </button>
                    {:else}
                        <!-- Logged in but Token Lost (Refresh) -> Reconnect -->
                        <button
                            onclick={handleGoogleLogin}
                            disabled={isLoading}
                            class="w-full flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20 px-3 py-2 rounded-lg transition-colors text-xs font-medium shadow-sm"
                        >
                            {#if isLoading}
                                <span
                                    class="material-symbols-outlined text-[16px] animate-spin"
                                    >refresh</span
                                >
                            {:else}
                                <span class="material-symbols-outlined text-[16px]"
                                    >sync_problem</span
                                >
                            {/if}
                            <span>Reconnect Drive</span>
                        </button>
                        <p
                            class="text-[10px] text-amber-600/80 dark:text-amber-500/80 text-center mt-1.5 px-1"
                        >
                            Session expired. Reconnect to sync.
                        </p>
                    {/if}
                {:else}
                    <!-- Google Login Button -->
                    <button
                        onclick={handleGoogleLogin}
                        disabled={isLoading}
                        class="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors text-xs font-medium shadow-sm"
                    >
                        {#if isLoading}
                            <span
                                class="material-symbols-outlined text-[16px] animate-spin"
                                >refresh</span
                            >
                        {:else}
                            <img
                                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                alt="Google"
                                class="w-4 h-4"
                            />
                        {/if}
                        <span>Link Google Account</span>
                    </button>
                    <p
                        class="text-[10px] text-slate-400 text-center mt-1.5 px-1"
                    >
                        Sync your endpoints across devices.
                    </p>
                {/if}
            </div>

            <!-- Profile Settings -->
            <div
                class="p-1 border-b border-slate-100 dark:border-border-dark/50"
            >
                <button
                    onclick={() => {
                        isOpen = false;
                        goto("/profile");
                    }}
                    class="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span class="material-symbols-outlined text-[16px]"
                        >person</span
                    >
                    Profile
                </button>
            </div>

            <!-- App Sign Out -->
            <div class="p-1">
                <button
                    onclick={handleAppSignOut}
                    class="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors flex items-center gap-2"
                >
                    <span class="material-symbols-outlined text-[16px]"
                        >logout</span
                    >
                    Sign Out
                </button>
            </div>
        </div>
    {/if}
</div>
