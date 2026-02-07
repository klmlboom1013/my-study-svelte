<script lang="ts">
    import { page } from "$app/stores";
    import "../../app.css";
    import Header from "$lib/components/layout/Header.svelte";
    import SidebarNav from "$lib/components/layout/SidebarNav.svelte";
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { afterNavigate, goto } from "$app/navigation";
    import { auth } from "$lib/firebase/firebase";
    import { onAuthStateChanged } from "firebase/auth";
    import { profileStore } from "$lib/stores/profileStore";
    import {
        authStore,
        loginWithGoogle,
        disconnectGoogle,
    } from "$lib/features/auth/services/authService";
    import { driveService } from "$lib/features/drive/services/driveService";
    import { settingsStore } from "$lib/stores/settingsStore";
    import { endpointService } from "$lib/features/endpoints/services/endpointService";
    import { get } from "svelte/store";
    import { getCookie } from "$lib/utils/cookie";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import FullLoading from "$lib/components/ui/FullLoading.svelte";
    import { executionService } from "$lib/features/execution/services/executionService";
    import { collectionExecutionService } from "$lib/features/execution/services/collectionExecutionService";
    import { syncService } from "$lib/features/drive/services/syncService";

    let { children } = $props();

    let isDrawerOpen = $state(false);

    // Alert Modal State
    let isAlertOpen = $state(false);
    let alertTitle = $state("");
    let alertMessage = $state("");
    let alertType = $state<"alert" | "confirm">("alert");
    let alertConfirmText = $state("OK");
    let alertCancelText = $state("Cancel");
    let onAlertConfirm = $state<(() => void) | undefined>(undefined);
    let onAlertCancel = $state<(() => void) | undefined>(undefined);

    // Full Loading Overlay State
    let isFullLoading = $state(false);
    let loadingMessage = $state("");

    // Auto-close drawer on navigation
    afterNavigate(() => {
        isDrawerOpen = false;
        // Check for Auto-Restore Opportunity (Google Connect Prompt) on every navigation
        // checkAndPromptGoogleConnect();
    });

    // User Profile Data
    let userProfile = $state({
        name: "Developer",
        role: "Admin",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    });

    onMount(() => {
        // App Authentication Check
        const accessToken = getCookie("accessToken");
        if (!accessToken) {
            goto("/signin");
            return;
        }

        // Firebase Auth Listener (Keep for basic user sync if needed, though we rely on store)
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            // This is just to ensure authStore has the user if page refreshes
            // But accessToken is lost on refresh.
            if (user) {
                authStore.update((s) => ({ ...s, firebaseUser: user }));
            }
        });

        const authUnsub = authStore.subscribe(async (state) => {
            if (state.accessToken && state.firebaseUser) {
                try {
                    // Ask user if they want to restore ALL data or just profile
                    showAlert(
                        "Restore Full Data",
                        "Do you want to restore all data (including settings and endpoints) from Google Drive?\nClick 'Cancel' to restore only your profile.",
                        "confirm",
                        async () => {
                            // Confirm: Full Restore
                            try {
                                isFullLoading = true;
                                loadingMessage =
                                    "Restoring all data from Google Drive...";

                                await syncService.forceRestore();

                                console.log("Full data restored from Drive");
                                showAlert(
                                    "Restore Complete",
                                    "All data has been successfully restored.",
                                    "alert",
                                    undefined,
                                    undefined,
                                    "OK",
                                );
                            } catch (err: any) {
                                console.error("Full restore failed", err);
                                showAlert(
                                    "Restore Failed",
                                    `An error occurred during restore: ${err.message}`,
                                    "alert",
                                    undefined,
                                    undefined,
                                    "OK",
                                );
                            } finally {
                                isFullLoading = false;
                            }
                        },
                        async () => {
                            // Cancel: Profile Only Restore (DEFAULT)
                            try {
                                const profile = await driveService.loadProfile(
                                    state.accessToken as string,
                                );
                                if (profile) {
                                    profile.restoreDateTime =
                                        new Date().toISOString();
                                    profileStore.updateProfile(profile);
                                    console.log(
                                        "Profile only restored from Drive",
                                    );
                                }
                            } catch (err: any) {
                                console.error("Profile restore failed", err);
                            }
                        },
                        "Connect",
                        "Cancel",
                    );
                } catch (e: any) {
                    console.error("Auto-Restore flow failed", e);
                    if (e.message && e.message.includes("401")) {
                        console.log(
                            "Token expired, triggering auto-refresh...",
                        );
                        disconnectGoogle(); // Clear the expired token
                        handleGoogleConnect(); // Prompt for re-auth
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

        // Trigger Auto Google Connect if just logged in
        const justLoggedIn = sessionStorage.getItem("justLoggedIn");
        if (justLoggedIn) {
            sessionStorage.removeItem("justLoggedIn");
            const googleToken = get(authStore).accessToken;
            if (!googleToken) {
                console.log(
                    "Just logged in, triggering auto Google connect...",
                );
                handleGoogleConnect();
            }
        }

        return () => {
            unsubscribe();
            profileUnsub();
        };
    });

    // Global Alert Listener for stores
    import { appStateStore } from "$lib/stores/appStateStore";
    $effect(() => {
        if ($appStateStore.globalAlert) {
            const { title, message, type, onConfirm } =
                $appStateStore.globalAlert;
            showAlert(title, message, type || "alert", onConfirm);
            // Clear the alert in the store so it doesn't re-trigger
            appStateStore.update((s) => ({ ...s, globalAlert: null }));
        }
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
            "Connect Google Account",
            "Google account connection is required to automatically restore your profile backup.\nConnect now?",
            "confirm",
            () => {
                // Confirm: Connect
                handleGoogleConnect();
            },
            () => {
                // Cancel: Suppress
                sessionStorage.setItem("hasDeclinedGoogleConnect", "true");
            },
            "Connect",
            "Cancel",
        );
    }

    async function handleGoogleConnect() {
        try {
            await loginWithGoogle();
            // Successful login will update authStore, triggering the subscription logic for Auto-Restore
        } catch (e) {
            console.error("Google Connect Failed", e);
            showAlert("Connection Failed", "Failed to connect Google account.");
        }
    }

    function showAlert(
        title: string,
        message: string,
        type: "alert" | "confirm" = "alert",
        onConfirm?: () => void,
        onCancel?: () => void,
        confirmText = "OK",
        cancelText = "Cancel",
    ) {
        alertTitle = title;
        alertMessage = message;
        alertType = type;
        alertConfirmText = confirmText;
        alertCancelText = cancelText;
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
    confirmText={alertConfirmText}
    cancelText={alertCancelText}
/>

<FullLoading isOpen={isFullLoading} message={loadingMessage} />

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
                    showCollections={true}
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
                    ignoreSettings={true}
                />
            </div>
        </div>
    {/if}
</div>
