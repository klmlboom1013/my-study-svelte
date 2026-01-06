<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import { driveService } from "$lib/services/driveService";
    import { authStore, loginWithGoogle } from "$lib/services/authService";

    let displayName = $state("Guest");
    let userId = $state("Guest"); // Keep internal ID if needed, but display name is priority
    let avatarUrl = $state("");
    let company = $state("");
    let team = $state("");
    let jobTitle = $state("");
    let role = $state("User");

    onMount(() => {
        // Use profileStore or fallback to localStorage 'profile'
        const stored = localStorage.getItem("profile");
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (data.userId) userId = data.userId;

                // Display Name: Nickname -> UserId
                displayName = data.nickname || data.userId || "Guest";

                if (data.avatarUrl) avatarUrl = data.avatarUrl;
                if (data.company) company = data.company;
                if (data.team) team = data.team;
                if (data.jobTitle) jobTitle = data.jobTitle;

                // Role: Job Category
                if (data.jobCategory && data.jobCategory !== "Please Select") {
                    role = data.jobCategory;
                } else {
                    role = "User"; // Reset or default
                }
            } catch (e) {
                console.error("Failed to parse profile", e);
            }
        } else {
            // Check legacy sign-in-page for minimal display if profile missing
            const legacy = localStorage.getItem("sign-in-page");
            if (legacy) {
                try {
                    const data = JSON.parse(legacy);
                    if (data.userId) userId = data.userId;
                    displayName = data.userId || "Guest";
                    if (data.avatarUrl) avatarUrl = data.avatarUrl;

                    // Legacy default
                    role = "User";
                } catch (e) {
                    console.error("Failed to parse legacy profile", e);
                }
            }
        }
    });

    const handleEdit = () => {
        goto("/profile/edit");
    };

    let isSyncing = $state(false);

    async function handleDriveBackup() {
        if (isSyncing) return;

        let token = $authStore.accessToken;

        // If not logged in or no token, try login first
        if (!token) {
            try {
                const result = await loginWithGoogle();
                token = result.token;
            } catch (error) {
                alert("Google Login failed.");
                return;
            }
        }

        if (!token) return;

        try {
            isSyncing = true;
            const storedData = localStorage.getItem("profile");
            let data = storedData ? JSON.parse(storedData) : {};

            await driveService.saveProfile(token, data);
            alert("Backup successful! (Saved to Google Drive App Data)");
        } catch (error: any) {
            console.error(error);
            alert(`Backup failed: ${error.message}`);
        } finally {
            isSyncing = false;
        }
    }

    async function handleDriveRestore() {
        if (isSyncing) return;

        if (
            !confirm(
                "This will overwrite your current local profile. Continue?",
            )
        )
            return;

        let token = $authStore.accessToken;

        // If not logged in or no token, try login first
        if (!token) {
            try {
                const result = await loginWithGoogle();
                token = result.token;
            } catch (error) {
                alert("Google Login failed.");
                return;
            }
        }

        if (!token) return;

        try {
            isSyncing = true;
            const data = await driveService.loadProfile(token);
            if (data) {
                // Save to local storage (profile)
                localStorage.setItem("profile", JSON.stringify(data));

                // Refresh view logic (similar to onMount)
                if (data.userId) userId = data.userId;
                displayName = data.nickname || data.userId || "Guest";
                if (data.avatarUrl) avatarUrl = data.avatarUrl;
                if (data.company) company = data.company;
                if (data.team) team = data.team;
                if (data.jobTitle) jobTitle = data.jobTitle;

                // Role: Job Category
                if (data.jobCategory && data.jobCategory !== "Please Select") {
                    role = data.jobCategory;
                } else {
                    role = "User";
                }

                alert("Restore successful!");
                // Reload to ensure all components update if needed, though state update above handles immediate view
                location.reload();
            } else {
                alert("No profile backup found in Google Drive.");
            }
        } catch (error: any) {
            console.error(error);
            alert(`Restore failed: ${error.message}`);
        } finally {
            isSyncing = false;
        }
    }
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
                <div class="flex items-center gap-2">
                    <button
                        onclick={handleDriveBackup}
                        disabled={isSyncing}
                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-card-dark dark:text-slate-300 dark:border-border-dark dark:hover:bg-background-dark disabled:opacity-50 shadow-sm"
                        title="Backup Profile to Google Drive"
                    >
                        {#if isSyncing}
                            <span
                                class="material-symbols-outlined text-[20px] animate-spin"
                                >sync</span
                            >
                        {:else}
                            <span class="material-symbols-outlined text-[20px]"
                                >cloud_upload</span
                            >
                        {/if}
                    </button>
                    <button
                        onclick={handleDriveRestore}
                        disabled={isSyncing}
                        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-card-dark dark:text-slate-300 dark:border-border-dark dark:hover:bg-background-dark disabled:opacity-50 shadow-sm"
                        title="Restore Profile from Google Drive"
                    >
                        {#if isSyncing}
                            <span
                                class="material-symbols-outlined text-[20px] animate-spin"
                                >sync</span
                            >
                        {:else}
                            <span class="material-symbols-outlined text-[20px]"
                                >cloud_download</span
                            >
                        {/if}
                    </button>
                    <button
                        onclick={handleEdit}
                        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm ml-2"
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
                <h1
                    class="text-2xl font-bold text-slate-900 dark:text-white mt-4"
                >
                    {displayName}
                </h1>
                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {role} • <span class="text-xs">{userId}</span>
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
