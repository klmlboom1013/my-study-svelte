<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import { profileStore } from "$lib/stores/profileStore";

    let userId = $state("");
    let avatarUrl = $state("");
    let isLoading = $state(false);
    let successMessage = $state("");

    // Tester Info
    let company = $state("");
    let team = $state("");
    let jobTitle = $state("");
    let positionSelect = $state("Please select");
    const positionOptions = [
        "Please select",
        "Manager",
        "Leader",
        "Direct Input",
    ];

    let jobCategory = $state("");
    let roleSelect = $state("Please Select");
    const roleOptions = [
        "Please Select",
        "Developer",
        "FrontEnd Developer",
        "BackEnd Developer",
        "Planner",
        "Service Planner",
        "Business Planner",
        "Business Analyst (BA)",
        "Product Manager (PM)",
        "Product Owner (PO)",
        "Product Designer",
        "UX Designer",
        "Direct Input",
    ];
    let nickname = $state("");

    // Applications
    const APP_OPTIONS = [
        { name: "WPAY", description: "Simple Payment Service" },
        { name: "Express", description: "Create Payment Button" },
        { name: "Smart", description: "SMS Payment Link" },
        { name: "sbuckwpay", description: "Starbucks Simple Payment" },
    ];

    let applications = $state<
        { id: string; appName: string; description: string }[]
    >([]);

    onMount(() => {
        try {
            const stored = localStorage.getItem("profile");

            // Check if we need to fall back to legacy 'sign-in-page' if profile is completely missing
            // But normally profileStore init handles this.
            // We just read what's there.

            if (stored) {
                const parsed = JSON.parse(stored);

                // Handle New Struture
                if (parsed.basicInfo) {
                    userId = parsed.basicInfo.userId || "";
                    nickname = parsed.basicInfo.nickname || "";
                    avatarUrl = parsed.basicInfo.avatarUrl || "";

                    if (parsed.testerInformation) {
                        company = parsed.testerInformation.company || "";
                        team = parsed.testerInformation.team || "";

                        // Map Position
                        const pos = parsed.testerInformation.position || "";
                        if (["Manager", "Leader"].includes(pos)) {
                            positionSelect = pos;
                            jobTitle = pos;
                        } else if (pos) {
                            positionSelect = "Direct Input";
                            jobTitle = pos;
                        } else {
                            positionSelect = "Please select";
                            jobTitle = "";
                        }

                        // Map Role
                        const role = parsed.testerInformation.role || "";
                        if (
                            roleOptions.includes(role) &&
                            role !== "Direct Input" &&
                            role !== "Please Select"
                        ) {
                            roleSelect = role;
                            jobCategory = role;
                        } else if (role) {
                            roleSelect = "Direct Input";
                            jobCategory = role;
                        } else {
                            roleSelect = "Please Select";
                            jobCategory = "";
                        }
                    }

                    if (parsed.myApplications) {
                        applications = parsed.myApplications.map(
                            (app: any) => ({
                                id: app.id || crypto.randomUUID(),
                                appName: app.appName || "",
                                description: app.description || "",
                            }),
                        );
                    }
                }
                // Handle Legacy/Transition Structure (Flat)
                else {
                    userId = parsed.userId || "Guest"; // Fallback
                    nickname = parsed.nickname || "";
                    avatarUrl = parsed.avatarUrl || "";
                    company = parsed.company || "";
                    team = parsed.team || "";

                    const pos = parsed.jobTitle || "";
                    jobTitle = pos;
                    if (["Manager", "Leader"].includes(pos)) {
                        positionSelect = pos;
                    } else if (pos) {
                        positionSelect = "Direct Input";
                    }

                    const role = parsed.jobCategory || "";
                    jobCategory = role;
                    if (roleOptions.includes(role)) {
                        roleSelect = role;
                    } else if (role) {
                        roleSelect = "Direct Input";
                    }

                    if (parsed.applications) {
                        applications = parsed.applications.map((app: any) => ({
                            id: app.id || crypto.randomUUID(),
                            appName: app.name || "", // Note 'name' vs 'appName'
                            description: app.description || "",
                        }));
                    }
                }
            } else {
                // Completely empty, check sign-in-page for userId
                const legacy = localStorage.getItem("sign-in-page");
                if (legacy) {
                    const lData = JSON.parse(legacy);
                    userId = lData.userId || "Guest";
                }
            }
        } catch (e) {
            console.error("Failed to load user info", e);
        }
    });

    const refreshAvatar = () => {
        const seed = Math.random().toString(36).substring(7);
        avatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
    };

    const addApplication = () => {
        applications = [
            ...applications,
            { id: crypto.randomUUID(), appName: "", description: "" },
        ];
    };

    const removeApplication = (id: string) => {
        applications = applications.filter((app) => app.id !== id);
    };

    const updateApplication = (
        id: string,
        field: "appName" | "description",
        value: string,
    ) => {
        applications = applications.map((app) => {
            if (app.id !== id) return app;

            if (field === "appName") {
                const option = APP_OPTIONS.find((o) => o.name === value);
                return {
                    ...app,
                    appName: value,
                    description: option ? option.description : app.description,
                };
            }

            return { ...app, [field]: value };
        });
    };

    const handleSave = async () => {
        isLoading = true;
        successMessage = "";

        try {
            // Read existing to preserve ID or other fields if any
            const storedString = localStorage.getItem("profile");
            const existing = storedString ? JSON.parse(storedString) : {};

            // Construct new data structure
            const now = new Date().toISOString();

            const newData = {
                id: existing.id || crypto.randomUUID(),
                saveDateTime: now,
                // Preserve backup/restore times
                backupDateTime: existing.backupDateTime,
                restoreDateTime: existing.restoreDateTime,

                basicInfo: {
                    userId: userId || "Guest",
                    nickname,
                    avatarUrl,
                },
                testerInformation: {
                    company,
                    team,
                    position: jobTitle,
                    role: jobCategory,
                },
                myApplications: applications
                    .filter(
                        (app, index, self) =>
                            index ===
                            self.findIndex((t) => t.appName === app.appName),
                    )
                    .map((app) => ({
                        id: app.id,
                        appName: app.appName,
                        description: app.description,
                    })),
            };

            // Update store and localStorage
            profileStore.updateProfile(newData);

            // Show success message briefly then redirect
            successMessage = "Profile updated successfully!";
            setTimeout(() => {
                goto("/profile");
            }, 1000);
        } catch (e) {
            console.error("Failed to save profile", e);
        } finally {
            isLoading = false;
        }
    };

    const handleCancel = () => {
        goto("/profile");
    };

    const handlePositionChange = () => {
        if (positionSelect === "Please select") {
            jobTitle = "";
        } else if (positionSelect !== "Direct Input") {
            jobTitle = positionSelect;
        } else {
            jobTitle = "";
        }
    };

    const handleRoleChange = () => {
        if (roleSelect === "Please Select") {
            jobCategory = "";
        } else if (roleSelect !== "Direct Input") {
            jobCategory = roleSelect;
        } else {
            jobCategory = "";
        }
    };
</script>

<div class="max-w-screen-2xl mx-auto py-8 px-4">
    <Breadcrumbs
        items={[
            { label: "Home", href: "/" },
            { label: "Profile", href: "/profile" },
            { label: "Edit Profile" },
        ]}
    />
    <div
        class="bg-white dark:bg-card-dark p-8 rounded-xl shadow-sm border border-slate-200 dark:border-border-dark mt-6"
    >
        <div>
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white">
                Edit Profile
            </h2>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Update your app profile information
            </p>
        </div>

        <form
            class="mt-6 space-y-8"
            onsubmit={(e) => {
                e.preventDefault();
                handleSave();
            }}
        >
            <!-- Basic Info -->
            <div class="space-y-4">
                <h3
                    class="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2"
                >
                    Basic Info
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label
                            for="userId"
                            class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                            User ID <span
                                class="text-xs text-slate-500 font-normal ml-1"
                                >(Read-only)</span
                            >
                        </label>
                        <input
                            id="userId"
                            name="userId"
                            type="text"
                            bind:value={userId}
                            disabled
                            class="appearance-none block w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 rounded-md cursor-not-allowed sm:text-sm"
                        />
                    </div>
                    <div>
                        <label
                            for="nickname"
                            class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                        >
                            Nickname
                        </label>
                        <input
                            id="nickname"
                            name="nickname"
                            type="text"
                            bind:value={nickname}
                            class="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Display Name"
                        />
                    </div>
                </div>

                <div>
                    <label
                        for="avatarUrl"
                        class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                        Avatar URL
                    </label>
                    <div class="flex gap-2">
                        <input
                            id="avatarUrl"
                            name="avatarUrl"
                            type="url"
                            bind:value={avatarUrl}
                            class="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="https://example.com/avatar.png"
                        />
                        <button
                            type="button"
                            onclick={refreshAvatar}
                            class="shrink-0 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1"
                            title="Generate Random Avatar"
                        >
                            <span class="material-symbols-outlined text-[20px]"
                                >refresh</span
                            >
                        </button>
                    </div>
                </div>
                <!-- Preview Section -->
                <div class="flex items-center gap-6 py-4">
                    <span
                        class="text-sm font-medium text-slate-700 dark:text-slate-300"
                        >Preview</span
                    >
                    <div
                        class="h-16 w-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 dark:border-slate-700 shrink-0"
                    >
                        {#if avatarUrl}
                            <img
                                src={avatarUrl}
                                alt="Avatar Preview"
                                class="h-full w-full object-cover"
                                onerror={(e) =>
                                    ((e.currentTarget as HTMLImageElement).src =
                                        "https://via.placeholder.com/64?text=Error")}
                            />
                        {:else}
                            <div
                                class="h-full w-full flex items-center justify-center text-slate-400"
                            >
                                <span class="material-symbols-outlined text-3xl"
                                    >account_circle</span
                                >
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Tester Info -->
            <div class="space-y-4">
                <h3
                    class="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2"
                >
                    Tester Information
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label
                            for="company"
                            class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >Company</label
                        >
                        <input
                            id="company"
                            type="text"
                            bind:value={company}
                            class="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label
                            for="team"
                            class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >Team</label
                        >
                        <input
                            id="team"
                            type="text"
                            bind:value={team}
                            class="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label
                            for="jobTitle"
                            class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >Position</label
                        >
                        <select
                            id="positionSelect"
                            bind:value={positionSelect}
                            onchange={handlePositionChange}
                            class="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-2"
                        >
                            {#each positionOptions as option}
                                <option value={option}>{option}</option>
                            {/each}
                        </select>
                        {#if positionSelect === "Direct Input"}
                            <input
                                id="jobTitle"
                                type="text"
                                bind:value={jobTitle}
                                class="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter your position"
                            />
                        {/if}
                    </div>
                    <div>
                        <label
                            for="roleSelect"
                            class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                            >Role</label
                        >
                        <select
                            id="roleSelect"
                            bind:value={roleSelect}
                            onchange={handleRoleChange}
                            class="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-2"
                        >
                            {#each roleOptions as option}
                                <option value={option}>{option}</option>
                            {/each}
                        </select>
                        {#if roleSelect === "Direct Input"}
                            <input
                                id="jobCategory"
                                type="text"
                                bind:value={jobCategory}
                                class="appearance-none block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Enter your role"
                            />
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Applications -->
            <div class="space-y-4">
                <div
                    class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2"
                >
                    <h3
                        class="text-lg font-semibold text-slate-900 dark:text-white"
                    >
                        My Applications
                    </h3>
                    <button
                        type="button"
                        onclick={addApplication}
                        class="text-sm text-primary font-medium hover:text-primary/80 flex items-center gap-1"
                    >
                        <span class="material-symbols-outlined text-[18px]"
                            >add</span
                        >
                        Add App
                    </button>
                </div>

                {#if applications.length === 0}
                    <div
                        class="text-center py-6 text-slate-500 dark:text-slate-400 text-sm italic bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700"
                    >
                        No applications registered. Click "Add App" to register
                        one.
                    </div>
                {:else}
                    <div class="space-y-3">
                        {#each applications as app (app.id)}
                            <div
                                class="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 relative group"
                            >
                                <button
                                    type="button"
                                    onclick={() => removeApplication(app.id)}
                                    class="absolute top-2 right-2 text-slate-400 hover:text-red-500 transition-colors p-1"
                                    title="Remove Application"
                                >
                                    <span
                                        class="material-symbols-outlined text-[18px]"
                                        >close</span
                                    >
                                </button>
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4 mr-6"
                                >
                                    <div>
                                        <label
                                            for={`app-name-${app.id}`}
                                            class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
                                            >App Name</label
                                        >
                                        <select
                                            id={`app-name-${app.id}`}
                                            value={app.appName}
                                            onchange={(e) =>
                                                updateApplication(
                                                    app.id,
                                                    "appName",
                                                    e.currentTarget.value,
                                                )}
                                            class="appearance-none block w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="" disabled
                                                >Select Application</option
                                            >
                                            {#each APP_OPTIONS as option}
                                                <option value={option.name}
                                                    >{option.name}</option
                                                >
                                            {/each}
                                        </select>
                                    </div>
                                    <div>
                                        <label
                                            for={`app-desc-${app.id}`}
                                            class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
                                            >Description</label
                                        >
                                        <input
                                            id={`app-desc-${app.id}`}
                                            type="text"
                                            value={app.description}
                                            oninput={(e) =>
                                                updateApplication(
                                                    app.id,
                                                    "description",
                                                    e.currentTarget.value,
                                                )}
                                            class="appearance-none block w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white dark:bg-slate-800 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Short description"
                                        />
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            {#if successMessage}
                <div class="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <span
                                class="material-symbols-outlined text-green-400"
                                >check_circle</span
                            >
                        </div>
                        <div class="ml-3">
                            <h3
                                class="text-sm font-medium text-green-800 dark:text-green-200"
                            >
                                {successMessage}
                            </h3>
                        </div>
                    </div>
                </div>
            {/if}

            <div
                class="flex items-center justify-end gap-4 pt-4 border-t border-slate-100 dark:border-border-dark/50"
            >
                <button
                    type="button"
                    onclick={handleCancel}
                    class="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    class="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {#if isLoading}
                        <span
                            class="material-symbols-outlined text-sm animate-spin mr-2"
                            >refresh</span
                        >
                    {/if}
                    Save Profile
                </button>
            </div>
        </form>
    </div>
</div>
