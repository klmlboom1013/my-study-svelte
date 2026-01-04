<script lang="ts">
    import logo from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { goto } from "$app/navigation";
    import LoginButton from "$lib/components/auth/LoginButton.svelte";
    import { initAuth } from "$lib/services/authService";
    import { syncService } from "$lib/services/syncService";

    import type { MouseEventHandler } from "svelte/elements";

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

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && headerSearchTerm.trim()) {
            goto(`/endpoint?q=${encodeURIComponent(headerSearchTerm.trim())}`);
        }
    }

    onMount(() => {
        // Initialize Auth and Sync Services
        initAuth();
        syncService.init();
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
                        class="flex w-full min-w-0 flex-1 resize-none overflow-hidden bg-transparent rounded-r-lg text-slate-900 dark:text-white focus:outline-0 placeholder:text-slate-400 dark:placeholder:text-[#5a718a] px-2 text-sm"
                        placeholder="Endpoint / to Search"
                        bind:value={headerSearchTerm}
                        onkeydown={handleSearchKeydown}
                    />
                    <div class="flex items-center pr-2">
                        <kbd
                            class="hidden sm:inline-block border border-slate-200 dark:border-border-dark rounded px-1.5 text-[10px] font-mono text-slate-400"
                        >
                            /
                        </kbd>
                    </div>
                </div>
            </label>
        {/if}

        {#if showUserControls}
            <div
                class="flex items-center gap-2 border-l border-slate-200 dark:border-border-dark pl-3 ml-1"
            >
                <!-- Create Test Button (+) -->
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

                <!-- Auth Button (Login / User Menu) -->
                <LoginButton />
            </div>
        {/if}
    </div>
</header>
