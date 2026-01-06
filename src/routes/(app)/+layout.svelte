<script lang="ts">
    import { page } from "$app/stores";
    import "../../app.css";
    import Header from "$lib/components/layout/Header.svelte";
    import SidebarNav from "$lib/components/layout/SidebarNav.svelte";
    import { onMount } from "svelte";
    import { fade, fly } from "svelte/transition";
    import { afterNavigate } from "$app/navigation";

    let { children } = $props();

    let isDrawerOpen = $state(false);

    // Auto-close drawer on navigation
    afterNavigate(() => {
        isDrawerOpen = false;
    });

    // User Profile Data
    let userProfile = $state({
        name: "Developer",
        role: "Admin",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    });

    onMount(() => {
        try {
            // Read from new separate 'profile' storage
            const stored = localStorage.getItem("profile");
            if (stored) {
                const parsed = JSON.parse(stored);

                // Name: User ID -> Nickname (if exists) -> User ID
                if (parsed.nickname) {
                    userProfile.name = parsed.nickname;
                } else if (parsed.userId) {
                    userProfile.name = parsed.userId;
                }

                if (parsed.avatarUrl) userProfile.avatar = parsed.avatarUrl;

                // Role: hNum -> Role (Job Category)
                if (
                    parsed.jobCategory &&
                    parsed.jobCategory !== "Please Select"
                ) {
                    userProfile.role = parsed.jobCategory;
                } else {
                    userProfile.role = "User";
                }
            } else {
                // Fallback to legacy sign-in-page logic (minimal)
                const legacy = localStorage.getItem("sign-in-page");
                if (legacy) {
                    const parsed = JSON.parse(legacy);
                    if (parsed.userId) userProfile.name = parsed.userId;
                    if (parsed.avatarUrl) userProfile.avatar = parsed.avatarUrl;
                    userProfile.role = "User";
                }
            }
        } catch (e) {
            console.error("Failed to load user profile", e);
        }
    });
</script>

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
