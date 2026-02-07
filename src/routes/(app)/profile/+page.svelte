<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import { driveService } from "$lib/features/drive/services/driveService";
    import {
        authStore,
        loginWithGoogle,
    } from "$lib/features/auth/services/authService";
    import { profileStore } from "$lib/stores/profileStore"; // Import store for consistent updates
    import AlertModal from "$lib/components/ui/AlertModal.svelte";

    let displayName = $state("Guest");
    let userId = $state("Guest");
    let avatarUrl = $state("");
    let company = $state("");
    let team = $state("");
    let jobTitle = $state("");
    let role = $state("User");

    // Timestamps
    let saveDateTime = $state("");
    let backupDateTime = $state("");
    let restoreDateTime = $state("");

    // Alert Modal State
    let isAlertOpen = $state(false);
    let alertTitle = $state("");
    let alertMessage = $state("");
    let alertType = $state<"alert" | "confirm">("alert");
    let onAlertConfirm = $state<(() => void) | undefined>(undefined);

    function showAlert(title: string, message: string) {
        alertTitle = title;
        alertMessage = message;
        alertType = "alert";
        onAlertConfirm = undefined;
        isAlertOpen = true;
    }

    function showConfirm(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            alertTitle = title;
            alertMessage = message;
            alertType = "confirm";
            onAlertConfirm = () => resolve(true);

            // Handle cancel/close as false
            const originalOnClose = () => resolve(false);

            // We need a way to hook into close/cancel from the promise wrapper context if we want robust promise handling
            // But for simple "Ok" -> resolve(true), "Cancel" -> implied resolve(false) via close logic if we wire it up.
            // Simplified:
            isAlertOpen = true;
        });
    }

    // Since showConfirm needs to handle the "Cancel" case to resolve false,
    // we need to update how AlertModal is used or handle the cancel callback.
    // Let's create a dedicated handler for the modal's onCancel prop in the template.
    let onAlertCancel = $state<(() => void) | undefined>(undefined);

    function showConfirmPromise(
        title: string,
        message: string,
    ): Promise<boolean> {
        return new Promise((resolve) => {
            alertTitle = title;
            alertMessage = message;
            alertType = "confirm";
            onAlertConfirm = () => resolve(true);
            onAlertCancel = () => resolve(false);
            isAlertOpen = true;
        });
    }

    onMount(() => {
        loadProfileFromStorage();
    });

    function loadProfileFromStorage() {
        const stored = localStorage.getItem("profile");
        if (stored) {
            try {
                const data = JSON.parse(stored);

                // Nested Structure Support
                if (data.basicInfo) {
                    userId = data.basicInfo.userId || "Guest";
                    displayName =
                        data.basicInfo.nickname ||
                        data.basicInfo.userId ||
                        "Guest";
                    avatarUrl = data.basicInfo.avatarUrl || "";

                    if (data.testerInformation) {
                        company = data.testerInformation.company || "";
                        team = data.testerInformation.team || "";
                        jobTitle = data.testerInformation.position || "";
                        role = data.testerInformation.role || "User";
                    }

                    saveDateTime = data.saveDateTime || "";
                    backupDateTime = data.backupDateTime || "";
                    restoreDateTime = data.restoreDateTime || "";
                }
                // Legacy Fallback
                else {
                    if (data.userId) userId = data.userId;
                    displayName = data.nickname || data.userId || "Guest";
                    avatarUrl = data.avatarUrl || "";
                    company = data.company || "";
                    team = data.team || "";
                    jobTitle = data.jobTitle || "";
                    role =
                        data.jobCategory && data.jobCategory !== "Please Select"
                            ? data.jobCategory
                            : "User";
                }
            } catch (e) {
                console.error("Failed to parse profile", e);
            }
        } else {
            const legacy = localStorage.getItem("sign-in-page");
            if (legacy) {
                try {
                    const data = JSON.parse(legacy);
                    if (data.userId) userId = data.userId;
                    displayName = data.userId || "Guest";
                    avatarUrl = data.avatarUrl || "";
                } catch (e) {}
            }
        }
    }

    const handleEdit = () => {
        goto("/profile/edit");
    };
</script>

<AlertModal
    bind:isOpen={isAlertOpen}
    title={alertTitle}
    message={alertMessage}
    type={alertType}
    onConfirm={onAlertConfirm}
    onCancel={onAlertCancel}
/>

<div class="max-w-7xl mx-auto py-8 px-6">
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
                        onclick={handleEdit}
                        class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm ml-2"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >edit</span
                        >
                        <span class="hidden sm:inline">Edit Profile</span>
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

                <!-- Timestamps Display (Optional but good for debug/status) -->
                {#if saveDateTime || backupDateTime || restoreDateTime}
                    <div class="mt-2 text-xs text-slate-400 space-y-0.5">
                        {#if saveDateTime}
                            <p>
                                Last Saved: {new Date(
                                    saveDateTime,
                                ).toLocaleString()}
                            </p>
                        {/if}
                        {#if backupDateTime}
                            <p>
                                Last Backup: {new Date(
                                    backupDateTime,
                                ).toLocaleString()}
                            </p>
                        {/if}
                        {#if restoreDateTime}
                            <p>
                                Last Restore: {new Date(
                                    restoreDateTime,
                                ).toLocaleString()}
                            </p>
                        {/if}
                    </div>
                {/if}

                <!-- Status and Joined removed as per request -->
            </div>
        </div>
    </div>
</div>
