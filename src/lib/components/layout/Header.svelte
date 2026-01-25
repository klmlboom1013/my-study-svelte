<script lang="ts">
    import logo from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import UserMenu from "$lib/components/auth/UserMenu.svelte";
    import SelectBox from "$lib/components/ui/SelectBox.svelte";
    import { initAuth, authStore } from "$lib/services/authService";
    import { profileStore } from "$lib/stores/profileStore";
    import { syncService } from "$lib/services/syncService";

    import type { MouseEventHandler } from "svelte/elements";

    import { appStateStore } from "$lib/stores/appStateStore";

    interface Props {
        showSidebarToggle?: boolean;
        showSearch?: boolean;
        showNotifications?: boolean;
        showEnvironment?: boolean;
        showBrand?: boolean;
        isSidebarOpen?: boolean;
        onToggleSidebar?: MouseEventHandler<HTMLButtonElement>;
        onToggleMobileMenu?: MouseEventHandler<HTMLButtonElement>;
        showUserControls?: boolean;
    }

    let {
        showSidebarToggle = true,
        showSearch = false,
        showNotifications = false,
        showEnvironment = true,
        showBrand = true,
        isSidebarOpen = false,
        onToggleSidebar = () => {},
        onToggleMobileMenu = () => {},
        showUserControls = true,
    }: Props = $props();

    // Global Search Logic
    let headerSearchTerm = $state("");
    // Use Shared Store for Selected App
    // We can't bind directly to store object property in Svelte 5 easily if we want reactivity?
    // Let's use auto-subscription $appStateStore
    // Or simpler: just let SelectBox bind to a local proxy or update store on change?
    // SelectBox binds to `value`.
    // Let's create a derived/linked state?
    // Actually, simple subscription is easiest.

    let selectedApp = $state("All");

    // Sync Store -> Local State
    $effect(() => {
        selectedApp = $appStateStore.selectedApp;
    });

    // Sync Local State -> Store (When user changes dropdown)
    function onAppChange(newValue: string) {
        appStateStore.update((s) => ({ ...s, selectedApp: newValue }));
        selectedApp = newValue;
    }

    // Subscribe to profileStore for applications list
    let applications = $derived.by(() => {
        const apps =
            $profileStore.myApplications?.map((app) => app.appName) || [];
        const uniqueApps = Array.from(new Set(apps)).filter(Boolean);
        return ["All", ...uniqueApps];
    });

    function updateUrl() {
        const params = new URLSearchParams($page.url.searchParams);
        if (headerSearchTerm.trim()) {
            params.set("q", headerSearchTerm.trim());
        } else {
            params.delete("q");
        }

        if (selectedApp && selectedApp !== "All") {
            params.set("app", selectedApp);
        } else {
            params.delete("app");
        }

        // Only navigate if we are on the endpoint page or forcing a search
        // But for global search, we redirect to /endpoint
        if ($page.url.pathname === "/endpoint") {
            goto(`/endpoint?${params.toString()}`, {
                keepFocus: true,
                noScroll: true,
            });
        }
        // Else: Do NOT navigate if safely on Settings
        // But if user hits Enter on search, they expect redirection?
        // handleSearchKeydown calls updateUrl.
        // If changing dropdown, $effect calls... wait.
    }

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            updateUrl();
        }
    }

    function clearSearch() {
        headerSearchTerm = "";
        updateUrl();
    }

    // Watch selectedApp change (Local State Change)
    $effect(() => {
        // When selectedApp changes (via Dropdown or other), update Store
        if ($appStateStore.selectedApp !== selectedApp) {
            appStateStore.update((s) => ({ ...s, selectedApp: selectedApp }));
        }

        if (selectedApp !== undefined && $page.url.pathname === "/endpoint") {
            // We need to avoid infinite loop if the URL change triggers this.
            // But selectedApp is local state.

            // Simple check: if mismatch
            const currentApp = $page.url.searchParams.get("app") || "All";
            if (
                selectedApp !== currentApp &&
                (selectedApp !== "All" || currentApp)
            ) {
                // "All" vs null/empty
                if (!(selectedApp === "All" && !currentApp)) {
                    updateUrl();
                }
            }
        }
    });

    onMount(() => {
        // Initialize Auth and Sync Services
        initAuth();
        syncService.init();

        // Init State from URL
        const q = $page.url.searchParams.get("q");
        if (q) headerSearchTerm = q;

        const app = $page.url.searchParams.get("app");
        if (app) {
            selectedApp = app;
            appStateStore.update((s) => ({ ...s, selectedApp: app }));
        } else {
            selectedApp = "All"; // Default
            appStateStore.update((s) => ({ ...s, selectedApp: "All" }));
        }
    });
</script>

<header
    class="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-border-dark px-4 py-3 bg-white/95 dark:bg-background-dark/95 backdrop-blur z-20"
>
    <!-- Left Section: Hamburger > Logo > Title -->
    <div class="flex items-center gap-4">
        {#if showSidebarToggle}
            <button
                class="flex items-center justify-center rounded-lg size-9 hover:bg-slate-100 dark:hover:bg-border-dark text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors border border-slate-200 dark:border-border-dark"
                onclick={onToggleMobileMenu}
                title={isSidebarOpen ? "Close Menu" : "Open Menu"}
            >
                <span class="material-symbols-outlined">menu</span>
            </button>
        {/if}

        {#if showBrand}
            <div class="flex items-center gap-3">
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
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <h2
                    class="text-lg font-bold leading-tight hidden md:block text-slate-900 dark:text-white cursor-pointer"
                    onclick={() => goto("/")}
                >
                    API Tester Hub
                </h2>
            </div>
        {/if}
    </div>

    <!-- Right Section: Search > Create > History > Avatar -->
    <div class="flex items-center gap-3 justify-end flex-1">
        {#if showSearch}
            <!-- Application Dropdown -->
            <div class="block md:block w-32 md:w-40">
                <SelectBox
                    id="header-app-select"
                    placeholder="Application"
                    options={applications}
                    bind:value={selectedApp}
                />
            </div>

            <!-- Search Bar -->
            <label class="hidden md:flex flex-col w-full max-w-sm h-9">
                <div
                    class="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-200 dark:border-border-dark focus-within:border-primary/50 transition-colors bg-slate-50 dark:bg-card-dark"
                >
                    <div
                        class="text-slate-400 dark:text-[#92adc9] flex items-center justify-center pl-2.5"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >search</span
                        >
                    </div>
                    <input
                        class="flex w-full min-w-0 flex-1 resize-none overflow-hidden bg-transparent rounded-r-lg text-slate-900 dark:text-white focus:outline-0 placeholder:text-slate-400 dark:placeholder:text-[#5a718a] pl-2 pr-8 text-sm"
                        placeholder="Endpoint search"
                        bind:value={headerSearchTerm}
                        onkeydown={handleSearchKeydown}
                    />
                    {#if headerSearchTerm}
                        <button
                            onclick={() => {
                                headerSearchTerm = "";
                                updateUrl();
                            }}
                            class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all flex items-center justify-center"
                            title="Clear search"
                        >
                            <span class="material-symbols-outlined text-[16px]"
                                >close</span
                            >
                        </button>
                    {/if}
                </div>
            </label>
        {/if}

        {#if showUserControls}
            <div class="flex items-center gap-2">
                <!-- Divider -->
                <div
                    class="w-px h-4 bg-slate-200 dark:bg-border-dark mx-1"
                ></div>

                <!-- Create Test Button (+) -->
                <div class="hidden md:block">
                    <Tooltip text="new Endpoint" delay={100}>
                        <button
                            onclick={() => goto("/endpoint/new")}
                            class="flex items-center justify-center rounded-lg size-8 hover:bg-slate-100 dark:hover:bg-border-dark text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <span class="material-symbols-outlined text-[20px]"
                                >add</span
                            >
                            <span class="sr-only">new Endpoint</span>
                        </button>
                    </Tooltip>
                </div>

                <!-- History Button -->
                <Tooltip text="Recent Activity" delay={100}>
                    <button
                        class="flex items-center justify-center rounded-lg size-8 hover:bg-slate-100 dark:hover:bg-border-dark text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >history</span
                        >
                        <span class="sr-only">History</span>
                    </button>
                </Tooltip>

                <!-- Sync Status Indicator -->
                {#if $authStore.accessToken}
                    <div
                        class="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30"
                        title="Google Drive Sync Active"
                    >
                        <span class="material-symbols-outlined text-[16px]"
                            >cloud_done</span
                        >
                        <span class="text-xs font-bold">Synced</span>
                    </div>
                {:else}
                    <div
                        class="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        title="Google Drive Sync Inactive"
                    >
                        <span class="material-symbols-outlined text-[16px]"
                            >cloud_off</span
                        >
                        <span class="text-xs font-bold">Not Synced</span>
                    </div>
                {/if}

                <div
                    class="w-px h-4 bg-slate-200 dark:bg-border-dark mx-1"
                ></div>

                <!-- User Menu -->
                <UserMenu />
            </div>
        {/if}
    </div>
</header>
