<script lang="ts">
    import logo from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { goto } from "$app/navigation";
    import { deleteCookie } from "$lib/utils/cookie";

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

    // User Info State
    let userInfo = $state({
        userId: "Guest",
        avatarUrl: "",
    });
    let showUserMenu = $state(false);
    let dropdownRef = $state<HTMLDivElement | null>(null);
    let buttonRef = $state<HTMLButtonElement | null>(null);

    // Global Search Logic
    let headerSearchTerm = $state("");

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && headerSearchTerm.trim()) {
            goto(`/endpoint?q=${encodeURIComponent(headerSearchTerm.trim())}`);
            // Optional: clear search term after searching, or keep it.
            // keeping it might be better UX if they want to modify it.
            // For now, let's keep it.
        }
    }

    // Random Avatar Logic
    const avatarSeeds = [
        "Felix",
        "Aneka",
        "Zoe",
        "Jack",
        "Bella",
        "Leo",
        "Mia",
        "Max",
        "Lara",
        "Tom",
        "Sky",
        "Sam",
        "Sora",
        "Kai",
        "Juno",
        "Nora",
        "Rex",
        "Amy",
        "Ben",
        "Eva",
        "Ben",
        "Eva",
    ];

    function getRandomAvatar() {
        const randomIndex = Math.floor(Math.random() * avatarSeeds.length);
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeeds[randomIndex]}`;
    }

    function loadUserInfo() {
        try {
            const stored = localStorage.getItem("sign-in-page");
            if (stored) {
                const data = JSON.parse(stored);
                userInfo.userId = data.userId || "Guest";
                userInfo.avatarUrl = data.avatarUrl || getRandomAvatar();
            } else {
                userInfo.avatarUrl = getRandomAvatar();
            }
        } catch (e) {
            console.error("Failed to load user info", e);
            userInfo.avatarUrl = getRandomAvatar();
        }
    }

    onMount(() => {
        loadUserInfo();

        // Click outside listener
        function handleClickOutside(event: MouseEvent) {
            if (
                showUserMenu &&
                dropdownRef &&
                buttonRef &&
                !dropdownRef.contains(event.target as Node) &&
                !buttonRef.contains(event.target as Node)
            ) {
                showUserMenu = false;
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    });

    function toggleUserMenu() {
        showUserMenu = !showUserMenu;
    }

    function handleSignOut() {
        // Clear auth token
        deleteCookie("accessToken");

        // Optional: Clear or update localStorage if needed
        // localStorage.removeItem("sign-in-page"); // Keeping it might be useful for remembering last login

        goto("/signin");
        showUserMenu = false;
    }
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

                <!-- Avatar -->
                <div class="relative">
                    <Tooltip text="User Menu" delay={100} position="bottom-end">
                        <button
                            bind:this={buttonRef}
                            class="ml-2 rounded-full overflow-hidden border border-slate-200 dark:border-border-dark size-8 flex items-center justify-center bg-slate-100 dark:bg-border-dark focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                            onclick={toggleUserMenu}
                        >
                            <img
                                src={userInfo.avatarUrl}
                                alt="User Avatar"
                                class="w-full h-full object-cover"
                            />
                        </button>
                    </Tooltip>

                    {#if showUserMenu}
                        <div
                            bind:this={dropdownRef}
                            class="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-xl shadow-xl overflow-hidden z-50 text-slate-700 dark:text-[#c9d1d9]"
                        >
                            <!-- User Info Section -->
                            <div
                                class="px-4 py-3 border-b border-slate-200 dark:border-[#30363d] flex items-center gap-3"
                            >
                                <div
                                    class="size-10 rounded-full border border-slate-200 dark:border-[#30363d] overflow-hidden shrink-0"
                                >
                                    <img
                                        src={userInfo.avatarUrl}
                                        alt="User Avatar"
                                        class="w-full h-full object-cover"
                                    />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div
                                        class="font-semibold text-sm truncate text-slate-900 dark:text-[#e6edf3]"
                                    >
                                        {userInfo.userId}
                                    </div>
                                    <div
                                        class="text-xs text-slate-500 dark:text-[#8b949e]"
                                    >
                                        Set status
                                    </div>
                                </div>
                                <!-- Change Button (Visual only) -->
                                <button
                                    class="text-slate-400 hover:text-slate-600 dark:text-[#8b949e] dark:hover:text-[#58a6ff]"
                                >
                                    <span
                                        class="material-symbols-outlined text-sm"
                                        >cached</span
                                    >
                                </button>
                            </div>

                            <!-- Menu Items -->
                            <div class="p-2">
                                <button
                                    class="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-[#1f6feb] dark:hover:text-white transition-colors"
                                >
                                    <span
                                        class="material-symbols-outlined text-[18px] text-slate-500 dark:text-[#8b949e] group-hover:text-current"
                                        >person</span
                                    >
                                    Profile
                                </button>
                            </div>

                            <div
                                class="h-px bg-slate-200 dark:bg-[#30363d] mx-2"
                            ></div>

                            <div class="p-2">
                                <button
                                    onclick={handleSignOut}
                                    class="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-[#1f6feb] dark:hover:text-white transition-colors"
                                >
                                    <span
                                        class="material-symbols-outlined text-[18px] text-slate-500 dark:text-[#8b949e] group-hover:text-current"
                                        >logout</span
                                    >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</header>
