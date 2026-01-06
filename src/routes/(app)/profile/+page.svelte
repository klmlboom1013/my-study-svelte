<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";

    let userId = $state("Guest");
    let avatarUrl = $state("");
    let role = $state("User");

    onMount(() => {
        try {
            const stored = localStorage.getItem("sign-in-page");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.userId) userId = parsed.userId;
                if (parsed.avatarUrl) avatarUrl = parsed.avatarUrl;

                // Parse hNum for role display logic similar to Layout
                if (parsed.hNum && parsed.hNum.length >= 6) {
                    const hNum = parsed.hNum;
                    role = `(${hNum.substring(0, 3)}) ${hNum.substring(3, 4)}***-**${hNum.substring(hNum.length - 2)}`;
                }
            }
        } catch (e) {
            console.error("Failed to load user profile", e);
        }
    });

    const handleEdit = () => {
        goto("/profile/edit");
    };
</script>

<div class="max-w-6xl mx-auto py-8 px-4">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Profile" }]} />

    <div
        class="mt-6 bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-border-dark overflow-hidden"
    >
        <!-- Header / Banner -->
        <div class="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

        <div class="px-8 pb-8">
            <div class="relative flex justify-between items-end -mt-12 mb-6">
                <!-- Avatar -->
                <div class="relative">
                    <div
                        class="h-24 w-24 rounded-full p-1 bg-white dark:bg-card-dark"
                    >
                        <div
                            class="h-full w-full rounded-full overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-700"
                        >
                            {#if avatarUrl}
                                <img
                                    src={avatarUrl}
                                    alt="Avatar"
                                    class="h-full w-full object-cover"
                                    onerror={(e) =>
                                        ((
                                            e.currentTarget as HTMLImageElement
                                        ).src =
                                            "https://via.placeholder.com/96?text=Error")}
                                />
                            {:else}
                                <div
                                    class="h-full w-full flex items-center justify-center text-slate-400"
                                >
                                    <span
                                        class="material-symbols-outlined text-5xl"
                                        >account_circle</span
                                    >
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div>
                    <button
                        onclick={handleEdit}
                        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >edit</span
                        >
                        Edit Profile
                    </button>
                </div>
            </div>

            <!-- User Info -->
            <div class="space-y-1">
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
                    {userId}
                </h1>
                <p
                    class="text-sm text-slate-500 dark:text-slate-400 font-medium"
                >
                    {role}
                </p>
                <!-- Add more user details if available, currently mostly placeholders or derived -->
                <div
                    class="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-border-dark/50"
                >
                    <div class="flex flex-col">
                        <span
                            class="text-xs text-slate-400 uppercase tracking-wider"
                            >Status</span
                        >
                        <span
                            class="text-sm font-medium text-green-600 flex items-center gap-1"
                        >
                            <span class="h-2 w-2 rounded-full bg-green-500"
                            ></span>
                            Active
                        </span>
                    </div>
                    <div
                        class="flex flex-col border-l border-slate-100 dark:border-border-dark/50 pl-4"
                    >
                        <span
                            class="text-xs text-slate-400 uppercase tracking-wider"
                            >Joined</span
                        >
                        <span class="text-sm text-slate-700 dark:text-slate-300"
                            >2026-01-01</span
                        >
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
