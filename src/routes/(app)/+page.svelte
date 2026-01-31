<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    // import { validateAccessToken } from "$lib/utils/auth/accessToken"; // Removed. used API.
    import { deleteCookie, getCookie } from "$lib/utils/cookie";
    import { decodeJwt } from "jose";
    import Footer from "$lib/components/layout/Footer.svelte";
    import { settingsStore } from "$lib/stores/settingsStore";

    let isValid = $state(false);

    onMount(async () => {
        const accessToken = getCookie("accessToken");

        if (!accessToken) {
            goto("/signin");
            return;
        }

        try {
            // Decode token to get mid (unverified first)
            const payload = decodeJwt(accessToken);
            const mid = payload.mid as string;

            if (!mid) {
                console.error("No mid in token");
                deleteCookie("accessToken");
                goto("/signin");
                return;
            }

            // const valid = await validateAccessToken(accessToken, mid);
            // Replace with API call
            const res = await fetch("/api/auth/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: accessToken, mid }),
            });
            const { isValid: valid } = await res.json();

            if (!valid) {
                // Invalid token, clear and redirect
                deleteCookie("accessToken");
                goto("/signin");
                return;
            }

            isValid = true;
        } catch (e) {
            console.error("Token decode/validation failed", e);
            deleteCookie("accessToken");
            goto("/signin");
        }
    });

    function handleLogout() {
        deleteCookie("accessToken");

        // Cleanup Input Info if isSaveCache is not true
        const storedData = localStorage.getItem("sign-in-page");
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                if (!parsedData.isSaveCache) {
                    localStorage.removeItem("sign-in-page");
                }
            } catch (e) {
                console.error("Failed to parse sign-in-page data", e);
            }
        }

        goto("/signin");
    }

    // Mobile Search Logic
    let mobileSearchTerm = $state("");

    function handleMobileSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && mobileSearchTerm.trim()) {
            goto(`/endpoint?q=${encodeURIComponent(mobileSearchTerm.trim())}`);
        }
    }

    import { appStateStore } from "$lib/stores/appStateStore";

    // Dynamic API Categories filtering based on selected app (for Mobile View)
    let filteredCategories = $derived.by(() => {
        const allApps = $settingsStore.applications || [];
        const headerApp = $appStateStore.selectedApp;
        const isAll = !headerApp || headerApp === "All";

        let categories: any[] = [];
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

{#if isValid}
    <div class="max-w-7xl mx-auto flex flex-col gap-8 py-8 px-4">
        <!-- Page Heading -->
        <div class="flex flex-wrap justify-between items-end gap-4 mt-9">
            <div class="flex flex-col gap-2">
                <h1
                    class="text-slate-900 dark:text-white text-3xl md:text-4xl font-black tracking-tight"
                >
                    Welcome back, Developer
                </h1>
                <p
                    class="text-slate-500 dark:text-slate-400 text-base font-normal"
                >
                    Select an API category below to start testing endpoints or
                    view recent activity.
                </p>
            </div>
        </div>

        <!-- Mobile API Categories (Visible only on mobile) -->
        <div class="flex flex-col gap-2 md:hidden">
            <!-- Mobile Search Bar -->
            <label class="flex flex-col w-full h-10 mb-2">
                <div
                    class="flex w-full flex-1 items-stretch rounded-lg h-full border border-slate-200 dark:border-slate-700 focus-within:border-primary/50 transition-colors bg-white dark:bg-slate-800"
                >
                    <div
                        class="text-slate-400 dark:text-[#92adc9] flex items-center justify-center pl-3"
                    >
                        <span class="material-symbols-outlined text-[20px]"
                            >search</span
                        >
                    </div>
                    <input
                        class="flex w-full min-w-0 flex-1 resize-none overflow-hidden bg-transparent rounded-r-lg text-slate-900 dark:text-white focus:outline-0 placeholder:text-slate-400 dark:placeholder:text-[#5a718a] px-2 text-sm"
                        placeholder="Endpoint / to Search"
                        bind:value={mobileSearchTerm}
                        onkeydown={handleMobileSearchKeydown}
                    />
                </div>
            </label>

            <h3 class="text-slate-900 dark:text-white text-xl font-bold mb-2">
                API Categories
            </h3>
            <div
                class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex flex-col gap-3"
            >
                <div class="flex flex-col gap-1">
                    {#each filteredCategories as category}
                        <button
                            onclick={() =>
                                goto(`/endpoint?category=${category.id}`)}
                            class="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 text-left group transition-colors"
                        >
                            <div
                                class="size-6 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-colors"
                                style={category.color
                                    ? `background-color: ${category.color}15; color: ${category.color}`
                                    : ""}
                            >
                                <span
                                    class="material-symbols-outlined text-[16px]"
                                    >{category.icon || "category"}</span
                                >
                            </div>
                            <span
                                class="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors"
                            >
                                {category.name}
                            </span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Statistics Cards -->
        {#if $settingsStore.interface?.dashboard?.showStats}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    class="flex flex-col gap-1 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative overflow-hidden group"
                >
                    <div
                        class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
                    >
                        <span
                            class="material-symbols-outlined text-6xl text-primary"
                            >bar_chart</span
                        >
                    </div>
                    <p
                        class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider"
                    >
                        Total Requests
                    </p>
                    <div class="flex items-end gap-3 mt-1">
                        <p
                            class="text-slate-900 dark:text-white text-3xl font-bold leading-none"
                        >
                            1,240
                        </p>
                        <span
                            class="text-[#0bda5b] text-sm font-medium bg-[#0bda5b]/10 px-1.5 py-0.5 rounded flex items-center"
                        >
                            <span
                                class="material-symbols-outlined text-[14px] mr-0.5"
                                >trending_up</span
                            > 5%
                        </span>
                    </div>
                    <p class="text-slate-400 dark:text-slate-500 text-xs mt-2">
                        Last 24 hours
                    </p>
                </div>
                <div
                    class="flex flex-col gap-1 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative overflow-hidden group"
                >
                    <div
                        class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
                    >
                        <span
                            class="material-symbols-outlined text-6xl text-red-500"
                            >error</span
                        >
                    </div>
                    <p
                        class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider"
                    >
                        Failed Requests
                    </p>
                    <div class="flex items-end gap-3 mt-1">
                        <p
                            class="text-slate-900 dark:text-white text-3xl font-bold leading-none"
                        >
                            12
                        </p>
                        <span
                            class="text-[#fa6238] text-sm font-medium bg-[#fa6238]/10 px-1.5 py-0.5 rounded flex items-center"
                        >
                            <span
                                class="material-symbols-outlined text-[14px] mr-0.5"
                                >trending_up</span
                            > 1.2%
                        </span>
                    </div>
                    <p class="text-slate-400 dark:text-slate-500 text-xs mt-2">
                        Requires attention
                    </p>
                </div>
                <div
                    class="flex flex-col gap-1 rounded-xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative overflow-hidden group"
                >
                    <div
                        class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
                    >
                        <span
                            class="material-symbols-outlined text-6xl text-blue-400"
                            >timer</span
                        >
                    </div>
                    <p
                        class="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider"
                    >
                        Avg Latency
                    </p>
                    <div class="flex items-end gap-3 mt-1">
                        <p
                            class="text-slate-900 dark:text-white text-3xl font-bold leading-none"
                        >
                            145ms
                        </p>
                        <span
                            class="text-[#0bda5b] text-sm font-medium bg-[#0bda5b]/10 px-1.5 py-0.5 rounded flex items-center"
                        >
                            <span
                                class="material-symbols-outlined text-[14px] mr-0.5"
                                >trending_down</span
                            > 10ms
                        </span>
                    </div>
                    <p class="text-slate-400 dark:text-slate-500 text-xs mt-2">
                        Optimal performance
                    </p>
                </div>
            </div>
        {/if}

        <!-- Recent Activity Section -->
        {#if $settingsStore.interface?.dashboard?.showRecentActivity}
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <h3
                        class="text-slate-900 dark:text-white text-xl font-bold"
                    >
                        Recent Activity
                    </h3>
                    <div class="flex gap-2">
                        <button
                            class="size-8 flex items-center justify-center rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-primary/50"
                        >
                            <span class="material-symbols-outlined text-[18px]"
                                >refresh</span
                            >
                        </button>
                        <button
                            class="size-8 flex items-center justify-center rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-primary/50"
                        >
                            <span class="material-symbols-outlined text-[18px]"
                                >filter_list</span
                            >
                        </button>
                    </div>
                </div>
                <div
                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
                >
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr
                                    class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                                >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24"
                                        >Method</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Endpoint</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Status</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                                        >Latency</th
                                    >
                                    <th
                                        class="p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right"
                                        >Time</th
                                    >
                                </tr>
                            </thead>
                            <tbody
                                class="divide-y divide-slate-200 dark:divide-slate-700 text-sm"
                            >
                                <tr
                                    class="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                >
                                    <td class="p-4">
                                        <span
                                            class="px-2 py-1 rounded text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20"
                                            >GET</span
                                        >
                                    </td>
                                    <td class="p-4">
                                        <div class="flex flex-col">
                                            <span
                                                class="text-slate-900 dark:text-white font-mono"
                                                >/v2/auth/validate</span
                                            >
                                            <span
                                                class="text-slate-500 dark:text-slate-400 text-xs"
                                                >Member Token</span
                                            >
                                        </div>
                                    </td>
                                    <td class="p-4">
                                        <span
                                            class="flex items-center gap-1.5 text-slate-900 dark:text-white"
                                        >
                                            <span
                                                class="size-2 rounded-full bg-green-500"
                                            ></span> 200 OK
                                        </span>
                                    </td>
                                    <td
                                        class="p-4 text-slate-500 dark:text-slate-400"
                                        >45ms</td
                                    >
                                    <td
                                        class="p-4 text-slate-500 dark:text-slate-400 text-right"
                                        >2 min ago</td
                                    >
                                </tr>
                                <tr
                                    class="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                >
                                    <td class="p-4">
                                        <span
                                            class="px-2 py-1 rounded text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20"
                                            >POST</span
                                        >
                                    </td>
                                    <td class="p-4">
                                        <div class="flex flex-col">
                                            <span
                                                class="text-slate-900 dark:text-white font-mono"
                                                >/v1/charges/create</span
                                            >
                                            <span
                                                class="text-slate-500 dark:text-slate-400 text-xs"
                                                >Payment Processing</span
                                            >
                                        </div>
                                    </td>
                                    <td class="p-4">
                                        <span
                                            class="flex items-center gap-1.5 text-slate-900 dark:text-white"
                                        >
                                            <span
                                                class="size-2 rounded-full bg-green-500"
                                            ></span> 201 Created
                                        </span>
                                    </td>
                                    <td
                                        class="p-4 text-slate-500 dark:text-slate-400"
                                        >120ms</td
                                    >
                                    <td
                                        class="p-4 text-slate-500 dark:text-slate-400 text-right"
                                        >15 min ago</td
                                    >
                                </tr>
                                <tr
                                    class="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                >
                                    <td class="p-4">
                                        <span
                                            class="px-2 py-1 rounded text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                            >PUT</span
                                        >
                                    </td>
                                    <td class="p-4">
                                        <div class="flex flex-col">
                                            <span
                                                class="text-slate-900 dark:text-white font-mono"
                                                >/v2/security/pin</span
                                            >
                                            <span
                                                class="text-slate-500 dark:text-slate-400 text-xs"
                                                >PIN Management</span
                                            >
                                        </div>
                                    </td>
                                    <td class="p-4">
                                        <span
                                            class="flex items-center gap-1.5 text-slate-900 dark:text-white"
                                        >
                                            <span
                                                class="size-2 rounded-full bg-red-500"
                                            ></span> 401 Unauthorized
                                        </span>
                                    </td>
                                    <td
                                        class="p-4 text-slate-500 dark:text-slate-400"
                                        >32ms</td
                                    >
                                    <td
                                        class="p-4 text-slate-500 dark:text-slate-400 text-right"
                                        >1 hour ago</td
                                    >
                                </tr>
                                <tr
                                    class="group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                >
                                    <td class="p-4">
                                        <span
                                            class="px-2 py-1 rounded text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20"
                                            >GET</span
                                        >
                                    </td>
                                    <td class="p-4">
                                        <div class="flex flex-col">
                                            <span
                                                class="text-slate-900 dark:text-white font-mono"
                                                >/v1/tokens/list</span
                                            >
                                            <span
                                                class="text-slate-500 dark:text-slate-400 text-xs"
                                                >Payment Token</span
                                            >
                                        </div>
                                    </td>
                                    <td class="p-4">
                                        <span
                                            class="flex items-center gap-1.5 text-slate-900 dark:text-white"
                                        >
                                            <span
                                                class="size-2 rounded-full bg-green-500"
                                            ></span> 200 OK
                                        </span>
                                    </td>
                                    <td
                                        class="p-4 text-slate-500 dark:text-slate-400"
                                        >210ms</td
                                    >
                                    <td
                                        class="p-4 text-slate-500 dark:text-slate-400 text-right"
                                        >3 hours ago</td
                                    >
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div
                        class="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-center"
                    >
                        <button
                            class="text-sm text-primary font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
                            >View full history</button
                        >
                    </div>
                </div>
            </div>
        {/if}
        <Footer />
    </div>
{:else}
    <p>인증 확인 중...</p>
{/if}
