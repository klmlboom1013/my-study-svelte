<script lang="ts">
    import logo from "$lib/assets/favicon.svg";
    import { onMount } from "svelte";
    import Tooltip from "$lib/components/ui/Tooltip.svelte";

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
    }: Props = $props();

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
    let randomAvatar = $state(
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeeds[0]}`,
    );

    function getRandomAvatar() {
        const randomIndex = Math.floor(Math.random() * avatarSeeds.length);
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeeds[randomIndex]}`;
    }

    onMount(() => {
        randomAvatar = getRandomAvatar();
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
                <h2
                    class="text-lg font-bold leading-tight hidden md:block text-slate-900 dark:text-white"
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

        <div
            class="flex items-center gap-2 border-l border-slate-200 dark:border-border-dark pl-3 ml-1"
        >
            <!-- Create Test Button (+) -->
            <Tooltip text="new Endpoint" delay={100}>
                <button
                    class="flex items-center justify-center rounded-lg size-8 hover:bg-slate-100 dark:hover:bg-border-dark text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                    <span class="material-symbols-outlined text-[20px]"
                        >add</span
                    >
                    <span class="sr-only">new Endpoint</span>
                </button>
            </Tooltip>

            <!-- History Button -->
            <button
                class="flex items-center justify-center rounded-lg size-8 hover:bg-slate-100 dark:hover:bg-border-dark text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                title="Recent Activity"
            >
                <span class="material-symbols-outlined text-[18px]"
                    >history</span
                >
                <span class="sr-only">History</span>
            </button>

            <!-- Avatar -->
            <button
                class="ml-2 rounded-full overflow-hidden border border-slate-200 dark:border-border-dark size-8 flex items-center justify-center bg-slate-100 dark:bg-border-dark"
                title="My Profile"
            >
                <img
                    src={randomAvatar}
                    alt="User Avatar"
                    class="w-full h-full object-cover"
                />
            </button>
        </div>
    </div>
</header>
