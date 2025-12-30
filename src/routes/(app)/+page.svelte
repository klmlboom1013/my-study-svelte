<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { validateAccessToken } from "$lib/utils/auth/accessToken";
    import { deleteCookie, getCookie } from "$lib/utils/cookie";
    import { decodeJwt } from "jose";

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

            const valid = await validateAccessToken(accessToken, mid);
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
</script>

{#if isValid}
    <div class="max-w-[1200px] mx-auto flex flex-col gap-8 pb-10">
        <!-- Page Heading -->
        <div class="flex flex-wrap justify-between items-end gap-4">
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
            <div class="flex gap-2">
                <button
                    onclick={handleLogout}
                    class="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
                >
                    <span class="material-symbols-outlined text-[20px]"
                        >logout</span
                    >
                    Logout
                </button>
                <button
                    class="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                    <span class="material-symbols-outlined text-[20px]"
                        >add</span
                    >
                    New Test Suite
                </button>
            </div>
        </div>

        <!-- Statistics Cards -->
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

        <!-- API Categories Grid -->
        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <h3 class="text-slate-900 dark:text-white text-xl font-bold">
                    API Categories
                </h3>
                <a
                    class="text-primary text-sm font-medium hover:text-blue-400"
                    href="/">View all categories</a
                >
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Card 1: Member Token -->
                <div
                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group cursor-pointer h-full"
                >
                    <div class="flex justify-between items-start">
                        <div
                            class="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors"
                        >
                            <span class="material-symbols-outlined">badge</span>
                        </div>
                        <span
                            class="flex size-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                        ></span>
                    </div>
                    <div class="flex flex-col gap-1 flex-1">
                        <h4
                            class="text-slate-900 dark:text-white font-bold text-lg"
                        >
                            Member Token
                        </h4>
                        <p
                            class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed"
                        >
                            Generate, validate, and refresh user access tokens
                            securely.
                        </p>
                    </div>
                    <div
                        class="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"
                    >
                        <span
                            class="text-xs text-slate-400 dark:text-slate-500 font-mono"
                            >/v2/auth</span
                        >
                        <span
                            class="text-primary text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                            Test <span
                                class="material-symbols-outlined text-[16px]"
                                >arrow_forward</span
                            >
                        </span>
                    </div>
                </div>
                <!-- Card 2: PIN Management -->
                <div
                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group cursor-pointer h-full"
                >
                    <div class="flex justify-between items-start">
                        <div
                            class="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors"
                        >
                            <span class="material-symbols-outlined">pin</span>
                        </div>
                        <span
                            class="flex size-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                        ></span>
                    </div>
                    <div class="flex flex-col gap-1 flex-1">
                        <h4
                            class="text-slate-900 dark:text-white font-bold text-lg"
                        >
                            PIN Management
                        </h4>
                        <p
                            class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed"
                        >
                            Endpoints to set, reset, or validate user security
                            PINs.
                        </p>
                    </div>
                    <div
                        class="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"
                    >
                        <span
                            class="text-xs text-slate-400 dark:text-slate-500 font-mono"
                            >/v2/security</span
                        >
                        <span
                            class="text-primary text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                            Test <span
                                class="material-symbols-outlined text-[16px]"
                                >arrow_forward</span
                            >
                        </span>
                    </div>
                </div>
                <!-- Card 3: Payment Token -->
                <div
                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group cursor-pointer h-full"
                >
                    <div class="flex justify-between items-start">
                        <div
                            class="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors"
                        >
                            <span class="material-symbols-outlined">token</span>
                        </div>
                        <span
                            class="flex size-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"
                            title="Maintenance"
                        ></span>
                    </div>
                    <div class="flex flex-col gap-1 flex-1">
                        <h4
                            class="text-slate-900 dark:text-white font-bold text-lg"
                        >
                            Payment Token
                        </h4>
                        <p
                            class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed"
                        >
                            Tokenize sensitive card data for PCI-compliant
                            processing.
                        </p>
                    </div>
                    <div
                        class="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"
                    >
                        <span
                            class="text-xs text-slate-400 dark:text-slate-500 font-mono"
                            >/v1/tokens</span
                        >
                        <span
                            class="text-primary text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                            Test <span
                                class="material-symbols-outlined text-[16px]"
                                >arrow_forward</span
                            >
                        </span>
                    </div>
                </div>
                <!-- Card 4: Payment Processing -->
                <div
                    class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group cursor-pointer h-full"
                >
                    <div class="flex justify-between items-start">
                        <div
                            class="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors"
                        >
                            <span class="material-symbols-outlined"
                                >payments</span
                            >
                        </div>
                        <span
                            class="flex size-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                        ></span>
                    </div>
                    <div class="flex flex-col gap-1 flex-1">
                        <h4
                            class="text-slate-900 dark:text-white font-bold text-lg"
                        >
                            Payment Processing
                        </h4>
                        <p
                            class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed"
                        >
                            Execute charges, refunds, and voids on transaction
                            IDs.
                        </p>
                    </div>
                    <div
                        class="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"
                    >
                        <span
                            class="text-xs text-slate-400 dark:text-slate-500 font-mono"
                            >/v1/charges</span
                        >
                        <span
                            class="text-primary text-sm font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                            Test <span
                                class="material-symbols-outlined text-[16px]"
                                >arrow_forward</span
                            >
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Activity Section -->
        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <h3 class="text-slate-900 dark:text-white text-xl font-bold">
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
    </div>
{:else}
    <p>인증 확인 중...</p>
{/if}
