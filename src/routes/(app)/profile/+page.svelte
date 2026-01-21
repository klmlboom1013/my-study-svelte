<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import { driveService } from "$lib/services/driveService";
    import { authStore, loginWithGoogle } from "$lib/services/authService";
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

    let isSyncing = $state(false);

    async function executeWithRetry(
        operationName: string,
        action: (token: string) => Promise<void>,
    ) {
        if (isSyncing) return;
        isSyncing = true;

        let token = $authStore.accessToken;

        try {
            // First attempt
            if (!token) {
                // If no token immediately, try login first
                const result = await loginWithGoogle();
                token = result.token;
            }

            if (!token) throw new Error("Failed to retrieve access token.");

            // Perform action
            await action(token);
        } catch (error: any) {
            // Check for 401 Unauthorized or specific Drive API error indicating invalid credentials
            const isAuthError =
                error.message.includes("401") ||
                error.message.includes("Invalid Credentials") ||
                error.message.includes("unauthorized");

            if (isAuthError) {
                console.log(
                    "Token expired or invalid. Retrying with fresh login...",
                );
                try {
                    // Retry: Force login to get fresh token
                    const result = await loginWithGoogle();
                    token = result.token;

                    if (!token)
                        throw new Error(
                            "Failed to retrieve access token on retry.",
                        );

                    // Retry action
                    await action(token);
                } catch (retryError: any) {
                    console.error("Retry failed:", retryError);
                    showAlert(
                        `${operationName} Failed`,
                        `Authentication failed. Please try logging in again.\nError: ${retryError.message}`,
                    );
                }
            } else {
                // Not an auth error, just fail
                console.error(error);
                showAlert(`${operationName} Failed`, `Error: ${error.message}`);
            }
        } finally {
            isSyncing = false;
        }
    }

    async function handleDriveBackup() {
        await executeWithRetry("Backup", async (token) => {
            const storedData = localStorage.getItem("profile");
            if (!storedData) {
                throw new Error(
                    "No profile data to backup. Please edit profile first.",
                );
            }

            let data = JSON.parse(storedData);

            // Update Backup Timestamp
            const now = new Date().toISOString();
            data.backupDateTime = now;
            backupDateTime = now; // Update Local State

            // Save to Drive
            await driveService.saveProfile(token, data);

            // Update Local Store with new timestamp
            profileStore.updateProfile(data);

            showAlert(
                "Backup Successful",
                "Your profile has been saved to Google Drive (App Data).",
            );
        });
    }

    async function handleDriveRestore() {
        // Confirmation before starting the sync process
        const confirmed = await showConfirmPromise(
            "Confirm Restore",
            "This will overwrite your current local profile with the backup from Google Drive.\n\nAre you sure you want to continue?",
        );

        if (!confirmed) return;

        await executeWithRetry("Restore", async (token) => {
            const data = await driveService.loadProfile(token);
            if (data) {
                // Update Restore Timestamp
                const now = new Date().toISOString();
                data.restoreDateTime = now;

                // Save to local storage via store
                profileStore.updateProfile(data);

                showAlert(
                    "Restore Successful",
                    "Your profile has been restored from Google Drive.",
                );

                onAlertConfirm = () => {
                    location.reload();
                };
            } else {
                throw new Error("No profile backup found in Google Drive.");
            }
        });
    }
</script>

<AlertModal
    bind:isOpen={isAlertOpen}
    title={alertTitle}
    message={alertMessage}
    type={alertType}
    onConfirm={onAlertConfirm}
    onCancel={onAlertCancel}
/>

<div class="max-w-screen-2xl mx-auto py-8 px-4">
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
