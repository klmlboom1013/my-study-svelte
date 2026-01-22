<script lang="ts">
    import { page } from "$app/stores";
    import "../../app.css";
    import Header from "$lib/components/layout/Header.svelte";
    import SidebarNav from "$lib/components/layout/SidebarNav.svelte";
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { afterNavigate } from "$app/navigation";
    import { auth } from "$lib/firebase/firebase";
    import { onAuthStateChanged } from "firebase/auth";
    import { profileStore } from "$lib/stores/profileStore";
    import { authStore, loginWithGoogle, disconnectGoogle } from "$lib/services/authService";
    import { driveService } from "$lib/services/driveService";
    import { get } from "svelte/store";
    import { getCookie } from "$lib/utils/cookie";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";

    let { children } = $props();

    let isDrawerOpen = $state(false);

    // Alert Modal State
    let isAlertOpen = $state(false);
    let alertTitle = $state("");
    let alertMessage = $state("");
    let alertType = $state<"alert" | "confirm">("alert");
    let onAlertConfirm = $state<(() => void) | undefined>(undefined);
    let onAlertCancel = $state<(() => void) | undefined>(undefined);

    // Auto-close drawer on navigation
    afterNavigate(() => {
        isDrawerOpen = false;
        // Check for Auto-Restore Opportunity (Google Connect Prompt) on every navigation
        checkAndPromptGoogleConnect();
    });

    // User Profile Data
    let userProfile = $state({
        name: "Developer",
        role: "Admin",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    });

    onMount(() => {
        // Firebase Auth Listener (Keep for basic user sync if needed, though we rely on store)
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            // This is just to ensure authStore has the user if page refreshes
            // But accessToken is lost on refresh.
            if (user) {
                authStore.update((s) => ({ ...s, firebaseUser: user }));
            }
        });

        // Watch authStore for Access Token to trigger Auto-Restore
        // This ensures we run ONLY when we have a valid token (e.g. after explicit login)
        const authUnsub = authStore.subscribe(async (state) => {
            if (state.accessToken && state.firebaseUser) {
                // Prevent repeated restores if already restored recently?
                // For now, we just restore. Since this runs on login.

                // We should check if we already have a "restored" profile to avoid overwriting edits?
                // But the requirement is "Auto-Restore on Login".

                // Check if profile is default/guest before restoring?
                // Or check timestamps?
                // Let's try to restore.

                try {
                    // Verify if we really need to restore.
                    // Maybe only if local profile is "fresh" (no saveDateTime) or user requests it?
                    // But user wants "Auto Restore".

                    // Optimization: check if we just restored to avoid loops if store updates trigger this.
                    // But store update of profile doesn't trigger authStore update.

                    const profile = await driveService.loadProfile(
                        state.accessToken,
                    );
                    if (profile) {
                        const current = get(profileStore);
                        // Optional: Compare timestamps?
                        // If Drive backup is newer than local save?
                        // For now, Strict Auto-Restore as per request.

                        profile.restoreDateTime = new Date().toISOString();
                        profileStore.updateProfile(profile);
                        console.log(
                        "Auto-Restored profile from Drive via Token",
                        );
                    }
                } catch (e: any) {
                    console.error("Auto-Restore failed", e);
                    // Check for 401 Unauthorized (Expired Token)
                    if (e.message && e.message.includes("401")) {
                        console.warn("Token expired. Disconnecting and prompting reconnect.");
                        disconnectGoogle();
                        // Trigger the connect prompt again
                        checkAndPromptGoogleConnect();
                    }
                }
            }
        });

        // Subscribe to profile store to update UI
        const profileUnsub = profileStore.subscribe((data) => {
            // Name mapping (Nickname > UserId)
            if (data.basicInfo?.nickname) {
                userProfile.name = data.basicInfo.nickname;
            } else if (data.basicInfo?.userId) {
                userProfile.name = data.basicInfo.userId;
            } else if (data.userId) {
                userProfile.name = data.userId; // Legacy/Fallback
            } else {
                userProfile.name = "Guest";
            }

            // Avatar
            if (data.basicInfo?.avatarUrl) {
                userProfile.avatar = data.basicInfo.avatarUrl;
            } else if (data.avatarUrl) {
                userProfile.avatar = data.avatarUrl;
            }

            // Role
            let role = "User";
            if (
                data.testerInformation?.role &&
                data.testerInformation.role !== "Please Select"
            ) {
                role = data.testerInformation.role;
            } else if (
                data.jobCategory &&
                data.jobCategory !== "Please Select"
            ) {
                role = data.jobCategory;
            }
            userProfile.role = role;
        });

        return () => {
            unsubscribe();
            profileUnsub();
        };
    });

    function checkAndPromptGoogleConnect() {
        // 1. Check if user is logged in to App (WPAY)
        const appToken = getCookie("accessToken");
        if (!appToken) return; // Not logged in, nothing to do

        // 2. Check if Google Token is missing (which it is on refresh)
        const googleToken = get(authStore).accessToken;
        if (googleToken) return; // Already connected

        // 3. Check if user already declined in this session
        const hasDeclined = sessionStorage.getItem("hasDeclinedGoogleConnect");
        if (hasDeclined) return;

        // Prompt
        showAlert(
            "Google 계정 연결",
            "프로필 백업을 자동 복구하려면 Google 계정 연결이 필요합니다.\n지금 연결하시겠습니까?",
            "confirm",
            () => {
                // Confirm: Connect
                handleGoogleConnect();
            },
            () => {
                // Cancel: Suppress
                sessionStorage.setItem("hasDeclinedGoogleConnect", "true");
            },
        );
    }

    async function handleGoogleConnect() {
        try {
            await loginWithGoogle();
            // Successful login will update authStore, triggering the subscription logic for Auto-Restore
        } catch (e) {
            console.error("Google Connect Failed", e);
            showAlert("연결 실패", "Google 계정 연결에 실패했습니다.");
        }
    }

    function showAlert(
        title: string,
        message: string,
        type: "alert" | "confirm" = "alert",
        onConfirm?: () => void,
        onCancel?: () => void,
    ) {
        alertTitle = title;
        alertMessage = message;
        alertType = type;
        onAlertConfirm = onConfirm;
        onAlertCancel = onCancel;
        isAlertOpen = true;
    }
</script>

<AlertModal
    bind:isOpen={isAlertOpen}
    title={alertTitle}
    message={alertMessage}
    type={alertType}
    onConfirm={onAlertConfirm}
    onCancel={onAlertCancel}
    confirmText="연결"
    cancelText="취소"
/>

<div
    class="flex flex-col h-screen bg-slate-50 dark:bg-background-dark transition-colors duration-300"
>
    <!-- Top Navigation Bar (Full Width) -->
    <Header
        showSidebarToggle={true}
        showBrand={true}
        showSearch={true}
        onToggleMobileMenu={() => (isDrawerOpen = !isDrawerOpen)}
        isSidebarOpen={isDrawerOpen}
    />

    <div class="flex flex-1 overflow-hidden relative">
        <!-- Persistent Sidebar (Desktop Only) -->
        <aside
            class="hidden md:flex w-64 bg-white dark:bg-background-dark border-r border-slate-200 dark:border-border-dark flex-col shrink-0"
        >
            <div class="flex-1 overflow-y-auto">
                <SidebarNav
                    isCollapsed={false}
                    {userProfile}
                    showCollections={false}
                />
            </div>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 overflow-y-auto w-full p-4 md:p-8">
            <div class="max-w-7xl mx-auto w-full">
                {@render children()}
            </div>
        </main>
    </div>

    <!-- Mobile Navigation Drawer -->
    {#if isDrawerOpen}
        <!-- Backdrop -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 bg-black/50 z-40 backdrop-blur-[1px]"
            onclick={() => (isDrawerOpen = false)}
            transition:fade={{ duration: 200 }}
        ></div>

        <!-- Drawer Panel -->
        <div
            class="fixed inset-y-0 left-0 w-fit max-w-[70%] min-w-[280px] bg-white dark:bg-background-dark z-50 shadow-2xl border-r border-slate-200 dark:border-border-dark flex flex-col"
            transition:fly={{ x: "-100%", duration: 300 }}
        >
            <!-- Drawer Header -->
            <div class="flex items-center justify-between p-4">
                <div class="flex items-center gap-2">
                    <div class="size-8 text-primary">
                        <svg
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"
                            ></path>
                        </svg>
                    </div>
                </div>
                <button
                    onclick={() => (isDrawerOpen = false)}
                    class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <!-- Drawer Content -->
            <div class="flex-1 overflow-y-auto">
                <SidebarNav
                    {userProfile}
                    showNewButton={true}
                    showCollections={true}
                    allowTextWrap={true}
                />
            </div>
        </div>
    {/if}
</div>
