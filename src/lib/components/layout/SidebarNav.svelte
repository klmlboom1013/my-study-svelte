<script lang="ts">
    interface Props {
        isCollapsed?: boolean; // Kept for compatibility but unused/always false
        userProfile: {
            name: string;
            role: string;
            avatar?: string;
            image?: string;
        };
        showNewButton?: boolean;
        showCollections?: boolean;
        allowTextWrap?: boolean;
    }

    let {
        isCollapsed = false,
        userProfile,
        showNewButton = true,
        showCollections = false,
        allowTextWrap = false,
    }: Props = $props();

    // Primary Navigation Data (Top Level)
    let primaryNav = [
        { name: "Report", icon: "description" },
        { name: "Issue", icon: "bug_report" },
        { name: "Test Suite", icon: "science" },
        { name: "Test Endpoint", icon: "api" },
        { name: "API Collections", icon: "folder_open" },
        { name: "API Categories", icon: "category" },
        { name: "Settings", icon: "settings" },
    ];

    // API Categories Data (Moved from Dashboard)
    let categories = [
        {
            id: "auth",
            name: "Member Token",
            endpoint: "/v2/auth",
            icon: "badge",
            iconColor: "text-blue-500",
            iconBg: "bg-blue-500/10",
        },
        {
            id: "security",
            name: "PIN Management",
            endpoint: "/v2/security",
            icon: "pin",
            iconColor: "text-purple-500",
            iconBg: "bg-purple-500/10",
        },
        {
            id: "tokens",
            name: "Payment Token",
            endpoint: "/v1/tokens",
            icon: "token",
            iconColor: "text-amber-500",
            iconBg: "bg-amber-500/10",
        },
        {
            id: "charges",
            name: "Payment Processing",
            endpoint: "/v1/charges",
            icon: "payments",
            iconColor: "text-emerald-500",
            iconBg: "bg-emerald-500/10",
        },
    ];
</script>

<div class="flex h-full flex-col p-4 gap-6">
    <!-- User Profile Snippet (Optional in drawer, but good for context) -->
    <!-- User didn't explicitly ask for profile here, but often drawers have it. 
         However, GitHub's drawer has navigation (Home, Issues...) and Repositories.
         We'll stick to the requested "API Collections".
    -->

    <!-- Action Button Removed: Replaced by inline 'New' button -->

    {#if showCollections}
        <!-- Primary Navigation Section -->
        <div class="flex flex-col gap-1 mt-2">
            {#each primaryNav as item}
                <button
                    class="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-border-dark text-left group transition-colors"
                >
                    <div
                        class="size-8 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors shrink-0"
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >{item.icon}</span
                        >
                    </div>
                    <span
                        class="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors {allowTextWrap
                            ? 'whitespace-normal break-words'
                            : 'truncate'}"
                    >
                        {item.name}
                    </span>
                </button>
            {/each}
        </div>

        <!-- Separator -->
        <div class="h-px bg-slate-200 dark:bg-border-dark my-2"></div>
    {/if}

    <!-- API Categories Section -->
    <div class="flex flex-col gap-2 mt-2">
        <div class="flex items-center justify-between px-2">
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                API Categories
            </h3>
            {#if showNewButton}
                <button
                    class="flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-0.5 rounded-md text-xs font-bold transition-colors shadow-sm"
                >
                    <span class="material-symbols-outlined text-[16px]"
                        >book</span
                    >
                    <span>New</span>
                </button>
            {/if}
        </div>

        <div class="flex flex-col gap-1">
            {#each categories as category}
                <button
                    class="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-border-dark text-left group transition-colors"
                >
                    <div
                        class="size-8 rounded-lg {category.iconBg} flex items-center justify-center {category.iconColor} shrink-0"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >{category.icon}</span
                        >
                    </div>
                    <div class="flex flex-col flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <span
                                class="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors {allowTextWrap
                                    ? 'whitespace-normal break-words'
                                    : 'truncate'}"
                            >
                                {category.name}
                            </span>
                        </div>
                    </div>
                </button>
            {/each}
        </div>
    </div>
</div>
