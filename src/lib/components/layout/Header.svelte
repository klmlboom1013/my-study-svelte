<script lang="ts">
    import logo from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";
    import { goto } from "$app/navigation";
    import { deleteCookie } from "$lib/utils/cookie";
    import { SERVICE_URLS } from "$lib/constants/wpayUrls";
    import {
        PROD_SERVER_DOMAINS,
        SERVER_TYPES,
        type ServiceType,
        type SiteType,
        type ServerType,
        type ProdServerDomain,
    } from "$lib/constants/wpayServerType";
    import ConfigModal from "$lib/components/layout/ConfigModal.svelte";

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

    // Domain Dropdown State
    let showDomainDropdown = $state(false);
    let domainDropdownRef = $state<HTMLDivElement | null>(null);
    let domainButtonRef = $state<HTMLButtonElement | null>(null);
    let domainList = $state<{ label: string; url: string }[]>([]);
    let selectedDomain = $state<{ label: string; url: string } | null>(null);
    let copiedUrl = $state<string | null>(null);

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

                // Load Domain List logic
                const service = data.service as ServiceType;
                const site = data.site as SiteType;

                if (service && site && SERVICE_URLS[service]) {
                    const urls = SERVICE_URLS[service];
                    domainList = [
                        { label: "DEV", url: `${urls.DEV}/${site}` },
                        { label: "STG", url: `${urls.STG}/${site}` },
                        {
                            label: "PROD (GLB)",
                            url: `${urls.PROD[PROD_SERVER_DOMAINS.GLB]}/${site}`,
                        },
                        {
                            label: "PROD (KS)",
                            url: `${urls.PROD[PROD_SERVER_DOMAINS.KS]}/${site}`,
                        },
                        {
                            label: "PROD (FC)",
                            url: `${urls.PROD[PROD_SERVER_DOMAINS.FC]}/${site}`,
                        },
                    ];

                    // Set default selected domain
                    const server = data.server as ServerType;
                    const prodDomain = data.prodDomain as ProdServerDomain;
                    let targetLabel = "DEV"; // Default fallback

                    if (server === SERVER_TYPES.DEV) {
                        targetLabel = "DEV";
                    } else if (server === SERVER_TYPES.STG) {
                        targetLabel = "STG";
                    } else if (server === SERVER_TYPES.PROD) {
                        if (prodDomain === PROD_SERVER_DOMAINS.GLB) {
                            targetLabel = "PROD (GLB)";
                        } else if (prodDomain === PROD_SERVER_DOMAINS.KS) {
                            targetLabel = "PROD (KS)";
                        } else if (prodDomain === PROD_SERVER_DOMAINS.FC) {
                            targetLabel = "PROD (FC)";
                        } else {
                            targetLabel = "PROD (GLB)"; // Default PROD fallback
                        }
                    }

                    selectedDomain =
                        domainList.find((d) => d.label === targetLabel) ||
                        domainList[0];
                }
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

            if (
                showDomainDropdown &&
                domainDropdownRef &&
                domainButtonRef &&
                !domainDropdownRef.contains(event.target as Node) &&
                !domainButtonRef.contains(event.target as Node)
            ) {
                showDomainDropdown = false;
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

    function toggleDomainDropdown() {
        showDomainDropdown = !showDomainDropdown;
    }

    function handleItemClick(item: { label: string; url: string }) {
        selectedDomain = item;
        showDomainDropdown = false;
    }

    async function handleCopyUrl(url: string) {
        try {
            await navigator.clipboard.writeText(url);
            copiedUrl = url;
            setTimeout(() => {
                copiedUrl = null;
            }, 2000);
        } catch (err) {
            console.error("Failed to copy!", err);
        }
    }

    // Config Modal
    let showConfigModal = $state(false);

    function handleConfigSave() {
        loadUserInfo(); // Reload to update domains/config
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
            <!-- Domain Dropdown -->
            {#if domainList.length > 0 && selectedDomain}
                <div class="relative">
                    <Tooltip text="Domains" delay={100}>
                        <button
                            bind:this={domainButtonRef}
                            onclick={toggleDomainDropdown}
                            class="flex items-center gap-2 justify-between px-3 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-border-dark text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors border border-slate-200 dark:border-border-dark min-w-[70px] md:min-w-[200px]"
                        >
                            <span class="text-sm md:hidden"
                                >{selectedDomain.label}</span
                            >
                            <span class="text-sm hidden md:block"
                                >{selectedDomain.url}</span
                            >
                            <span class="material-symbols-outlined text-[20px]"
                                >arrow_drop_down_circle</span
                            >
                        </button>
                    </Tooltip>

                    {#if showDomainDropdown}
                        <div
                            bind:this={domainDropdownRef}
                            class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-xl shadow-xl overflow-hidden z-50 py-2 sm:left-0 sm:translate-x-0"
                        >
                            <div
                                class="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-[#8b949e] uppercase tracking-wider"
                            >
                                Available Domains
                            </div>
                            {#each domainList as item}
                                <button
                                    class="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-[#1f6feb] group transition-colors flex items-center justify-between gap-2 {selectedDomain.label ===
                                    item.label
                                        ? 'bg-slate-50 dark:bg-white/5'
                                        : ''}"
                                    onclick={() => handleItemClick(item)}
                                >
                                    <div class="min-w-0 flex-1">
                                        <div
                                            class="text-sm font-medium text-slate-900 dark:text-[#c9d1d9] group-hover:text-slate-900 dark:group-hover:text-white"
                                        >
                                            {item.label}
                                        </div>
                                        <div
                                            class="text-xs text-slate-500 dark:text-[#8b949e] truncate group-hover:text-slate-600 dark:group-hover:text-[#e6edf3]"
                                        >
                                            {item.url}
                                        </div>
                                    </div>
                                    {#if selectedDomain.label === item.label}
                                        <span
                                            class="material-symbols-outlined text-[16px] text-primary"
                                            >check</span
                                        >
                                    {/if}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}

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
                                <button
                                    onclick={() => {
                                        showUserMenu = false;
                                        showConfigModal = true;
                                    }}
                                    class="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-[#1f6feb] dark:hover:text-white transition-colors"
                                >
                                    <span
                                        class="material-symbols-outlined text-[18px] text-slate-500 dark:text-[#8b949e] group-hover:text-current"
                                        >settings</span
                                    >
                                    Configuration
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

<ConfigModal
    bind:isOpen={showConfigModal}
    onClose={() => (showConfigModal = false)}
    onSave={handleConfigSave}
/>
