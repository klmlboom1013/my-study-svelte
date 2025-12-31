<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";

    let { children } = $props();

    // Mock User Data for UI
    let userProfile = $state({
        name: "Guest",
        role: "Senior Developer",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCblOgtDjtnDJSLaGqLAuOkd-LFd1CiGCSNlBhdoAqHa72HSCnsXRkRGbsmxjW8Olvrsdc03v8dN1MxiJv6v6A8OmIX7U2kBifHV5-0oT2OMWTbx_Ro5vF94zQ6ef5NKqZZphDBu4qV5JcL7mgQT3cXx4mOCBwfHT9aqpM4pNbOYBtyafKRfTSiuWAqi8fVzU3ildxAnzcp5JN0GsYEGmMQloAZ5cc2QbA6ywyeMzdOyK3yBCZw2fRTSIkH8eP5B9bq3GWopqcENC4",
    });

    onMount(() => {
        try {
            const stored = localStorage.getItem("sign-in-page");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.userId) {
                    userProfile.name = parsed.userId;
                }
                if (parsed.hNum && parsed.hNum.length >= 6) {
                    const hNum = parsed.hNum;
                    // Format: (010) 2***-**17
                    // (First 3 digits) + " " + 4th digit + "***-**" + Last 2 digits
                    userProfile.role = `(${hNum.substring(0, 3)}) ${hNum.substring(3, 4)}***-**${hNum.substring(hNum.length - 2)}`;
                } else {
                    userProfile.role = "Developer";
                }
                if (parsed.avatarUrl) {
                    userProfile.image = parsed.avatarUrl;
                }
            }
        } catch (e) {
            console.error("Failed to load user profile", e);
        }
    });

    let isMobileMenuOpen = $state(false);
    let isSidebarOpen = $state(true);

    function toggleMobileMenu() {
        isMobileMenuOpen = !isMobileMenuOpen;
    }

    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
    }
</script>

<div
    class="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white"
>
    <!-- Sidebar Navigation -->
    <aside
        class={`hidden ${isSidebarOpen ? "lg:flex" : ""} flex-col w-72 h-full border-r border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark shrink-0 transition-all duration-300`}
    >
        <div class="flex h-full flex-col justify-between p-4">
            <div class="flex flex-col gap-4">
                <!-- User Profile Snippet -->
                <div class="flex items-center gap-3 px-2 py-3 mb-2">
                    <div
                        class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-slate-200 dark:border-border-dark"
                        style="background-image: url('{userProfile.image}');"
                    ></div>
                    <div class="flex flex-col">
                        <h1
                            class="text-slate-900 dark:text-white text-base font-medium leading-normal"
                        >
                            {userProfile.name}
                        </h1>
                        <p
                            class="text-slate-500 dark:text-[#92adc9] text-xs font-normal leading-normal"
                        >
                            {userProfile.role}
                        </p>
                    </div>
                </div>
                <!-- Navigation Links -->
                <div class="flex flex-col gap-2">
                    <a
                        class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30 transition-colors group"
                        href="/"
                    >
                        <span
                            class="material-symbols-outlined text-primary group-hover:text-primary transition-colors"
                            >dashboard</span
                        >
                        <p class="text-sm font-medium leading-normal">
                            Dashboard
                        </p>
                    </a>
                    <button
                        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-[#92adc9] hover:bg-slate-100 dark:hover:bg-border-dark hover:text-slate-900 dark:hover:text-white transition-colors text-left w-full"
                    >
                        <span class="material-symbols-outlined">api</span>
                        <p class="text-sm font-medium leading-normal">
                            API Collections
                        </p>
                    </button>
                    <button
                        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-[#92adc9] hover:bg-slate-100 dark:hover:bg-border-dark hover:text-slate-900 dark:hover:text-white transition-colors text-left w-full"
                    >
                        <span class="material-symbols-outlined">history</span>
                        <p class="text-sm font-medium leading-normal">
                            History
                        </p>
                    </button>
                    <button
                        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-[#92adc9] hover:bg-slate-100 dark:hover:bg-border-dark hover:text-slate-900 dark:hover:text-white transition-colors text-left w-full"
                    >
                        <span class="material-symbols-outlined"
                            >description</span
                        >
                        <p class="text-sm font-medium leading-normal">
                            Documentation
                        </p>
                    </button>
                    <button
                        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 dark:text-[#92adc9] hover:bg-slate-100 dark:hover:bg-border-dark hover:text-slate-900 dark:hover:text-white transition-colors text-left w-full"
                    >
                        <span class="material-symbols-outlined">settings</span>
                        <p class="text-sm font-medium leading-normal">
                            Settings
                        </p>
                    </button>
                </div>
            </div>
            <!-- Environment Badge -->
            <div
                class="p-3 bg-slate-50 dark:bg-card-dark rounded-lg border border-slate-200 dark:border-border-dark mt-auto"
            >
                <div class="flex items-center gap-2 mb-2">
                    <div
                        class="size-2 rounded-full bg-green-500 animate-pulse"
                    ></div>
                    <span
                        class="text-xs font-bold text-slate-500 dark:text-[#92adc9] uppercase tracking-wider"
                        >System Status</span
                    >
                </div>
                <p class="text-slate-900 dark:text-white text-sm font-medium">
                    All Systems Operational
                </p>
            </div>
        </div>
    </aside>

    <!-- Main Content Area -->
    <main
        class="flex flex-col flex-1 h-full overflow-hidden bg-background-light dark:bg-background-dark relative"
    >
        <!-- Top Navigation Bar -->
        <header
            class="flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-border-dark px-6 py-3 bg-white/95 dark:bg-background-dark/95 backdrop-blur z-20 sticky top-0"
        >
            <div class="flex items-center gap-8 w-full max-w-2xl">
                <div
                    class="flex items-center gap-3 text-slate-900 dark:text-white"
                >
                    <button
                        class="hidden lg:flex items-center justify-center rounded-lg size-9 hover:bg-slate-100 dark:hover:bg-border-dark text-slate-900 dark:text-white transition-colors"
                        onclick={toggleSidebar}
                        title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                    >
                        <span class="material-symbols-outlined">menu</span>
                    </button>

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
                    <h2 class="text-lg font-bold leading-tight hidden md:block">
                        API Tester Hub
                    </h2>
                </div>
                <!-- Search Bar -->
                <label class="hidden md:flex flex-col w-full max-w-md h-10">
                    <div
                        class="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-200 dark:border-border-dark focus-within:border-primary/50 transition-colors"
                    >
                        <div
                            class="text-slate-400 dark:text-[#92adc9] flex bg-slate-50 dark:bg-card-dark items-center justify-center pl-3 rounded-l-lg border-r-0"
                        >
                            <span class="material-symbols-outlined text-[20px]"
                                >search</span
                            >
                        </div>
                        <input
                            class="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-slate-900 dark:text-white focus:outline-0 bg-slate-50 dark:bg-card-dark h-full placeholder:text-slate-400 dark:placeholder:text-[#5a718a] px-3 text-sm font-normal leading-normal"
                            placeholder="Search endpoints (e.g. /v1/payments)..."
                        />
                    </div>
                </label>
            </div>
            <div class="flex flex-1 justify-end gap-6 items-center">
                <!-- Environment Switcher -->
                <div
                    class="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-card-dark px-3 py-1.5 rounded-lg border border-slate-200 dark:border-border-dark cursor-pointer hover:border-primary/30 transition-colors"
                >
                    <span class="size-2 rounded-full bg-yellow-500"></span>
                    <span
                        class="text-slate-900 dark:text-white text-sm font-medium"
                        >Sandbox</span
                    >
                    <span
                        class="material-symbols-outlined text-slate-400 dark:text-[#92adc9] text-[16px]"
                        >expand_more</span
                    >
                </div>
                <!-- Action Icons -->
                <div class="flex gap-2">
                    <button
                        class="flex items-center justify-center rounded-lg size-9 bg-slate-50 dark:bg-card-dark hover:bg-slate-100 dark:hover:bg-border-dark text-slate-900 dark:text-white border border-slate-200 dark:border-border-dark transition-colors"
                        title="알람 기능 지원 준비중 입니다."
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >notifications</span
                        >
                    </button>
                    <button
                        class="flex items-center justify-center rounded-lg size-9 bg-slate-50 dark:bg-card-dark hover:bg-slate-100 dark:hover:bg-border-dark text-slate-900 dark:text-white border border-slate-200 dark:border-border-dark transition-colors"
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >help</span
                        >
                    </button>
                </div>
                <!-- Mobile Menu Toggle -->
                <button
                    class="lg:hidden flex items-center justify-center rounded-lg size-9 text-slate-900 dark:text-white"
                    onclick={toggleMobileMenu}
                >
                    <span class="material-symbols-outlined">menu</span>
                </button>
            </div>
        </header>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-4 md:p-8">
            {@render children()}
        </div>
    </main>
</div>
