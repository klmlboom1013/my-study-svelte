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
        ignoreSettings?: boolean;
    }

    let {
        isCollapsed = false,
        userProfile,
        showNewButton = true,
        showCollections = false,
        allowTextWrap = false,
        ignoreSettings = false,
    }: Props = $props();

    import { goto } from "$app/navigation";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { settingsStore, type ApiCategory } from "$lib/stores/settingsStore";

    // Primary Navigation Data (Top Level)
    let primaryNav = [
        { name: "Report", icon: "description", path: "/report" },
        { name: "Issue", icon: "bug_report", path: "/issue" },
        { name: "Test Suite", icon: "science", path: "/test-suite" },
        { name: "Test Endpoint", icon: "api", path: "/endpoint" },
        { name: "API Collections", icon: "folder_open", path: "/collections" },
        { name: "API Categories", icon: "category", path: "/categories" },
        { name: "Settings", icon: "settings", path: "/settings" },
    ];

    // Dynamic API Categories filtering based on selected app
    let filteredCategories = $derived.by(() => {
        const allApps = $settingsStore.applications || [];
        const headerApp = $appStateStore.selectedApp;
        const isAll = !headerApp || headerApp === "All";

        let categories: ApiCategory[] = [];
        for (const app of allApps) {
            if (app.apiCategories) {
                if (isAll || app.appName === headerApp) {
                    categories = [...categories, ...app.apiCategories];
                }
            }
        }
        return categories;
    });
</script>

<div class="flex h-full flex-col p-4 gap-6">
    <!-- User Profile Snippet (Optional in drawer, but good for context) -->
    <!-- User didn't explicitly ask for profile here, but often drawers have it. 
         However, GitHub's drawer has navigation (Home, Issues...) and Repositories.
         We'll stick to the requested "API Collections".
    -->

    <!-- Action Button Removed: Replaced by inline 'New' button -->

    <!-- Primary Navigation Section -->
    <div class="flex flex-col gap-1 mt-2">
        <!-- Home Button -->
        <button
            onclick={() => goto("/")}
            class="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-border-dark text-left group transition-colors"
        >
            <div
                class="size-8 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors shrink-0"
            >
                <span class="material-symbols-outlined text-[20px]">home</span>
            </div>
            <span
                class="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors {allowTextWrap
                    ? 'whitespace-normal break-words'
                    : 'truncate'}"
            >
                Home
            </span>
        </button>

        {#if showCollections}
            {#each primaryNav as item}
                {@const showItem =
                    ignoreSettings ||
                    item.path === "/settings" ||
                    (item.path === "/report" &&
                        $settingsStore.interface?.sidebar?.showReport) ||
                    (item.path === "/issue" &&
                        $settingsStore.interface?.sidebar?.showIssue) ||
                    (item.path === "/test-suite" &&
                        $settingsStore.interface?.sidebar?.showTestSuite) ||
                    (item.path === "/endpoint" &&
                        $settingsStore.interface?.sidebar?.showEndpoint) ||
                    (item.path === "/collections" &&
                        $settingsStore.interface?.sidebar?.showCollections) ||
                    (item.path === "/categories" &&
                        $settingsStore.interface?.sidebar?.showCategories)}
                {#if showItem}
                    <button
                        onclick={() => item.path && goto(item.path)}
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
                {/if}
            {/each}
        {/if}
    </div>

    {#if showCollections}
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
            {#each filteredCategories as category}
                <button
                    onclick={() => goto(`/endpoint?category=${category.id}`)}
                    class="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-border-dark text-left group transition-colors"
                >
                    <div
                        class="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-colors"
                        style={category.color
                            ? `background-color: ${category.color}15; color: ${category.color}`
                            : ""}
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >{category.icon || "category"}</span
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
