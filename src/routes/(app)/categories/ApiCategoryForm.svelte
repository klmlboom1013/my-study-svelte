<script lang="ts">
    import { goto } from "$app/navigation";
    import { settingsStore, type ApiCategory } from "$lib/stores/settingsStore";
    import MultiSelectBox from "$lib/components/ui/MultiSelectBox.svelte";
    import AlertModal from "$lib/components/ui/AlertModal.svelte";

    import { profileStore } from "$lib/stores/profileStore";

    interface Props {
        category?: ApiCategory; // If provided, we are in EDIT mode
    }

    let { category }: Props = $props();

    let isEditMode = $derived(!!category);
    let form = $state({
        application: "",
        service: [] as string[],
        name: "",
        description: "",
        icon: "category",
        color: "",
    });

    // Derived state for available services based on selected application
    let availableServices = $derived.by(() => {
        const selectedApp = $profileStore.myApplications.find(
            (app) => app.appName === form.application,
        );
        // Check if app exists, has services, AND uses service distinction
        if (
            !selectedApp ||
            !selectedApp.services ||
            selectedApp.useServiceDistinction === false
        )
            return [];
        return selectedApp.services.map((s) => s.name);
    });

    // Alert Modal state (Local to this component or we could use a store/context if we had one)
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

    // Initialize form if category is provided
    $effect(() => {
        if (category) {
            form.application = category.application;
            form.service = category.service
                ? Array.isArray(category.service)
                    ? [...category.service]
                    : [category.service]
                : [];
            form.name = category.name;
            form.description = category.description;
            form.icon = category.icon || "category";
            form.color = category.color || "";
        } else {
            // Default values for new category
            // Random color generator
            if (!form.color) {
                const colors = [
                    "#EF4444",
                    "#F97316",
                    "#F59E0B",
                    "#84CC16",
                    "#10B981",
                    "#06B6D4",
                    "#3B82F6",
                    "#6366F1",
                    "#8B5CF6",
                    "#D946EF",
                    "#F43F5E",
                ];
                form.color = colors[Math.floor(Math.random() * colors.length)];
            }
        }
    });

    function handleSubmit() {
        if (
            !form.application ||
            !form.name ||
            (availableServices.length > 0 &&
                (!form.service || form.service.length === 0))
        ) {
            showAlert("Error", "Please fill in all required fields.");
            return;
        }

        const categoryData = {
            application: form.application,
            service: form.service,
            name: form.name,
            description: form.description,
            icon: form.icon,
            color: form.color,
        };

        if (isEditMode && category) {
            settingsStore.updateApiCategory({
                id: category.id,
                ...categoryData,
            });
        } else {
            settingsStore.addApiCategory(categoryData);
        }

        goto("/categories");
    }

    function handleCancel() {
        goto("/categories");
    }
</script>

<div
    class="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm"
>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Application -->
        <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold text-slate-500 uppercase"
                >Application <span class="text-red-500">*</span></span
            >
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
                <span class="text-xs font-semibold text-slate-500 uppercase"
                    >Service <span class="text-red-500">*</span></span
                >
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
            <span class="text-xs font-semibold text-slate-500 uppercase"
                >Category Name <span class="text-red-500">*</span></span
            >
            <input
                type="text"
                placeholder="e.g., Payment Ops"
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
                placeholder="Optional description"
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
                    id="api-cat-icon"
                    class="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                    bind:value={form.icon}
                >
                    <option value="category">Default (Category)</option>
                    <option value="person">Member (Person)</option>
                    <option value="group">Members (Group)</option>
                    <option value="payments">Payments</option>
                    <option value="credit_card">Card</option>
                    <option value="account_balance">Bank</option>
                    <option value="receipt_long">History/Receipt</option>
                    <option value="settings">Settings</option>
                    <option value="lock">Security (Lock)</option>
                    <option value="key">Key</option>
                    <option value="api">API</option>
                    <option value="search">Search</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="database">Database</option>
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
                            >{form.icon || "category"}</span
                        >

                        <!-- Edit Overlay -->
                        <div
                            class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                        >
                            <span
                                class="material-symbols-outlined text-white text-[16px]"
                                >palette</span
                            >
                        </div>

                        <!-- Color Indicator (If color is set) -->
                        {#if !form.color}
                            <div
                                class="absolute bottom-1 right-1 size-2 rounded-full bg-slate-300 dark:bg-slate-600"
                            ></div>
                        {/if}
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
                Update Category
            {:else}
                <span class="material-symbols-outlined text-sm">add</span>
                Create Category
            {/if}
        </button>
    </div>
</div>

<AlertModal
    isOpen={alertModalState.isOpen}
    title={alertModalState.title}
    message={alertModalState.message}
/>
