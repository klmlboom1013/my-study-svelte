<script lang="ts">
    import { goto } from "$app/navigation";
    import {
        settingsStore,
        type ApiCollection,
    } from "$lib/stores/settingsStore";
    import MultiSelectBox from "$lib/components/ui/MultiSelectBox.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";
    import { profileStore } from "$lib/stores/profileStore";

    interface Props {
        collection?: ApiCollection; // If provided, we are in EDIT mode
        onSuccess?: () => void;
        onCancel?: () => void;
        useCardStyle?: boolean;
    }

    let {
        collection,
        onSuccess,
        onCancel,
        useCardStyle = true,
    }: Props = $props();

    let isEditMode = $derived(!!collection);
    let form = $state({
        application: "",
        service: [] as string[],
        name: "",
        description: "",
        icon: "folder",
        color: "",
    });

    // Derived state for available services based on selected application
    let availableServices = $derived.by(() => {
        const selectedApp = $profileStore.myApplications.find(
            (app) => app.appName === form.application,
        );
        if (
            !selectedApp ||
            !selectedApp.services ||
            selectedApp.useServiceDistinction === false
        )
            return [];
        return selectedApp.services.map((s) => s.name);
    });

    // Alert Modal state
    let alertModalState = $state({
        isOpen: false,
        title: "",
        message: "",
    });

    function showAlert(title: string, message: string) {
        alertModalState.title = title;
        alertModalState.message = message;
        alertModalState.isOpen = true;
    }

    // Initialize form if collection is provided
    $effect(() => {
        if (collection) {
            form.application = collection.application;
            form.service = collection.service
                ? Array.isArray(collection.service)
                    ? [...collection.service]
                    : [collection.service]
                : [];
            form.name = collection.name;
            form.description = collection.description;
            form.icon = collection.icon || "folder";
            form.color = collection.color || "";
        } else {
            // Default color for new collection
            if (!form.color) {
                const colors = [
                    "#6366F1", // Indigo
                    "#3B82F6", // Blue
                    "#10B981", // Emerald
                    "#F59E0B", // Amber
                    "#F43F5E", // Rose
                    "#8B5CF6", // Violet
                    "#06B6D4", // Cyan
                ];
                form.color = colors[Math.floor(Math.random() * colors.length)];
            }
        }
    });

    function handleSubmit() {
        if (!form.application || !form.name) {
            showAlert("Error", "Please fill in all required fields.");
            return;
        }

        const collectionData = {
            application: form.application,
            service: form.service,
            name: form.name,
            description: form.description,
            icon: form.icon,
            color: form.color,
            endpointIds: collection?.endpointIds || [], // Preserve endpoints
        };

        if (isEditMode && collection) {
            settingsStore.updateApiCollection({
                id: collection.id,
                ...collectionData,
                isBookmarked: collection.isBookmarked,
            });
        } else {
            settingsStore.addApiCollection(collectionData);
        }

        if (onSuccess) {
            onSuccess();
        } else {
            goto("/collections");
        }
    }

    function handleCancel() {
        if (onCancel) {
            onCancel();
        } else {
            goto("/collections");
        }
    }
</script>

<div
    class={useCardStyle
        ? "bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm"
        : ""}
>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Application -->
        <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-slate-500 uppercase">
                Application <span class="text-red-500">*</span>
            </span>
            <select
                class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                bind:value={form.application}
                onchange={() => (form.service = [])}
            >
                <option value="" disabled>Select Application</option>
                {#each $profileStore.myApplications as app}
                    <option value={app.appName}>{app.appName}</option>
                {/each}
            </select>
        </label>

        <!-- Service (Conditional) -->
        {#if availableServices.length > 0}
            <div class="flex flex-col gap-1">
                <span class="text-xs font-semibold text-slate-500 uppercase">
                    Service
                </span>
                <MultiSelectBox
                    options={availableServices}
                    bind:value={form.service}
                    placeholder="Select Services"
                />
            </div>
        {/if}
    </div>

    <!-- Name & Description -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-slate-500 uppercase">
                Collection Name <span class="text-red-500">*</span>
            </span>
            <input
                type="text"
                placeholder="e.g., E-Commerce APIs"
                class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                bind:value={form.name}
            />
        </label>
        <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-slate-500 uppercase"
                >Description</span
            >
            <input
                type="text"
                placeholder="Description for sequential execution according to business flows"
                class="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white dark:placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                bind:value={form.description}
            />
        </label>
    </div>

    <!-- Icon & Color -->
    <div class="mb-6">
        <label class="flex flex-col gap-1 w-full md:w-1/3">
            <span class="text-xs font-semibold text-slate-500 uppercase"
                >Icon</span
            >
            <div class="flex gap-2">
                <select
                    class="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                    bind:value={form.icon}
                >
                    <option value="folder">Folder</option>
                    <option value="collections">Collections</option>
                    <option value="folder_special">Special Folder</option>
                    <option value="auto_awesome_motion">Cards (Motion)</option>
                    <option value="library_books">Library</option>
                    <option value="book">Book</option>
                    <option value="bookmark">Bookmark</option>
                    <option value="star">Star</option>
                    <option value="work">Work</option>
                    <option value="shopping_bag">Shopping</option>
                    <option value="rocket_launch">Rocket</option>
                    <option value="bolt">Bolt</option>
                </select>

                <!-- Color Picker -->
                <div class="relative shrink-0 group">
                    <input
                        type="color"
                        bind:value={form.color}
                        class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
                        title="Click to change color"
                    />
                    <div
                        class="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 overflow-hidden relative group-hover:border-primary/50 transition-colors"
                        style={form.color
                            ? `background-color: ${form.color}20`
                            : ""}
                    >
                        <span
                            class="material-symbols-outlined text-[20px]"
                            style={form.color ? `color: ${form.color}` : ""}
                        >
                            {form.icon}
                        </span>

                        <!-- Edit Overlay -->
                        <div
                            class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                        >
                            <span
                                class="material-symbols-outlined text-white text-[16px]"
                                >palette</span
                            >
                        </div>
                    </div>
                </div>
            </div>
        </label>
    </div>

    <!-- Actions -->
    <div
        class="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700"
    >
        <button
            class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            onclick={handleCancel}
        >
            Cancel
        </button>
        <button
            class="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            onclick={handleSubmit}
        >
            {#if isEditMode}
                Update Collection
            {:else}
                <span class="material-symbols-outlined text-sm">add</span>
                Create Collection
            {/if}
        </button>
    </div>
</div>

<AlertModal
    isOpen={alertModalState.isOpen}
    title={alertModalState.title}
    message={alertModalState.message}
/>
