<script lang="ts">
    import {
        settingsStore,
        type ApiCollection,
        type CollectionStep,
    } from "$lib/stores/settingsStore";
    import { profileStore } from "$lib/stores/profileStore";
    import { appStateStore } from "$lib/stores/appStateStore";
    import { goto } from "$app/navigation";
    import EndpointSidebar from "./EndpointSidebar.svelte";
    import CollectionStepEditor from "./CollectionStepEditor.svelte";
    import Breadcrumbs from "$lib/components/common/Breadcrumbs.svelte";
    import type { Endpoint } from "$lib/types/endpoint";

    interface Props {
        collection?: ApiCollection;
    }

    let { collection }: Props = $props();

    // Use effects to initialize state from props once
    let name = $state("");
    let description = $state("");
    let application = $state("");
    let selectedService = $state("");
    let steps = $state<CollectionStep[]>([]);
    let draggedStepIndex = $state<number | null>(null);
    let draggableStepIndex = $state<number | null>(null);
    let isBookmarked = $state(false);
    let color = $state("#3b82f6");
    let icon = $state("folder");

    $effect(() => {
        name = collection?.name || "";
        description = collection?.description || "";
        application =
            collection?.application || $appStateStore.selectedApp || "All";
        selectedService = collection?.service?.[0] || "";
        steps = collection?.steps || [];
        isBookmarked = collection?.isBookmarked || false;
        color = collection?.color || "#3b82f6";
        icon = collection?.icon || "folder";
    });

    let currentApp = $derived(
        $settingsStore.applications.find((a) => a.appName === application),
    );

    let services = $derived(currentApp?.services || []);

    // Reset service if current application doesn't support it or if application changes
    $effect(() => {
        if (application) {
            if (services.length === 0) {
                selectedService = "";
            } else if (!services.find((s) => s.name === selectedService)) {
                // Keep current if still valid, otherwise reset or keep empty
            }
        }
    });

    function handleDrop(e: DragEvent) {
        e.preventDefault();

        // Handle internal reordering
        if (draggedStepIndex !== null) {
            // Reordering is handled in handleDropReorder, but if dropped in main area
            // we should reset or treat as cancellation of reorder if not dropped on a target.
            // Actually, handleDropReorder stops propagation, so this only fires if dropped
            // in empty space or non-target.
            draggedStepIndex = null;
            return;
        }

        if (!e.dataTransfer) return;

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));

            // Handle new endpoint drop
            if (data && data.id) {
                // Add new step
                const newStep: CollectionStep = {
                    id: crypto.randomUUID(),
                    endpointId: data.id,
                    name: data.name,
                };
                steps = [...steps, newStep];
            }
        } catch (err) {
            console.error("Failed to parse dropped data", err);
        }
    }

    function handleDragStart(e: DragEvent, index: number) {
        // Only allow drag if we are in draggable state (triggered by mousedown on handle)
        if (draggableStepIndex !== index) {
            e.preventDefault();
            return;
        }

        draggedStepIndex = index;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.dropEffect = "move";
            e.dataTransfer.setData("text/plain", index.toString());
        }
    }

    function handleDragOver(e: DragEvent, index: number) {
        e.preventDefault();
        if (draggedStepIndex === null || draggedStepIndex === index) return;
        // console.log('Drag over:', index);
    }

    function handleDropReorder(e: DragEvent, targetIndex: number) {
        e.preventDefault();
        e.stopPropagation();

        if (draggedStepIndex === null || draggedStepIndex === targetIndex) {
            draggedStepIndex = null;
            return;
        }

        const newSteps = [...steps];
        const [movedStep] = newSteps.splice(draggedStepIndex, 1);
        newSteps.splice(targetIndex, 0, movedStep);
        steps = newSteps;

        draggedStepIndex = null;
    }

    function handleDragEnd() {
        draggedStepIndex = null;
    }

    function handleUpdateStep(index: number, updatedStep: CollectionStep) {
        steps[index] = updatedStep;
    }

    function handleRemoveStep(index: number) {
        steps = steps.filter((_, i) => i !== index);
    }

    async function handleSave() {
        if (!name) {
            alert("Please enter a collection name.");
            return;
        }

        const collectionData: ApiCollection = {
            id: collection?.id || crypto.randomUUID(),
            name,
            description,
            application,
            service: selectedService ? [selectedService] : [],
            steps,
            isBookmarked,
            color,
            icon,
        };

        if (collection?.id) {
            settingsStore.updateApiCollection(collectionData);
        } else {
            settingsStore.addApiCollection(collectionData);
        }

        goto("/collections");
    }

    function handleCancel() {
        goto("/collections");
    }
</script>

<div
    class="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-900"
>
    <!-- Header -->
    <header
        class="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0"
    >
        <div class="flex items-center gap-4">
            <Breadcrumbs
                items={[
                    { label: "Home", href: "/" },
                    { label: "API Collections", href: "/collections" },
                    {
                        label: collection
                            ? "Edit Collection"
                            : "New Collection",
                    },
                ]}
            />
        </div>
        <div class="flex items-center gap-2">
            <button
                onclick={handleCancel}
                class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
                Cancel
            </button>
            <button
                onclick={handleSave}
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
            >
                {collection ? "Save Changes" : "Create Collection"}
            </button>
        </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
        <!-- Left Sidebar: Endpoints -->
        <EndpointSidebar />

        <!-- Main Workspace -->
        <main class="flex-1 overflow-y-auto p-8">
            <div class="max-w-4xl mx-auto">
                <!-- Collection Basic Info -->
                <div
                    class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-8 shadow-sm"
                >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-4">
                            <div>
                                <label
                                    for="col-name"
                                    class="block text-xs font-bold text-slate-500 uppercase mb-1.5"
                                    >Collection Name</label
                                >
                                <input
                                    id="col-name"
                                    type="text"
                                    bind:value={name}
                                    placeholder="Enter flow name..."
                                    class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all font-semibold"
                                />
                            </div>
                            <div>
                                <label
                                    for="col-app"
                                    class="block text-xs font-bold text-slate-500 uppercase mb-1.5"
                                    >Application</label
                                >
                                <select
                                    id="col-app"
                                    bind:value={application}
                                    class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all"
                                >
                                    <option value="All">All Applications</option
                                    >
                                    {#each $profileStore.myApplications as app}
                                        <option value={app.appName}
                                            >{app.appName}</option
                                        >
                                    {/each}
                                </select>
                            </div>
                            {#if services.length > 0}
                                <div>
                                    <label
                                        for="col-service"
                                        class="block text-xs font-bold text-slate-500 uppercase mb-1.5"
                                        >Service</label
                                    >
                                    <select
                                        id="col-service"
                                        bind:value={selectedService}
                                        class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all font-semibold"
                                    >
                                        <option value="">Select Service</option>
                                        {#each services as svc}
                                            <option value={svc.name}
                                                >{svc.name}</option
                                            >
                                        {/each}
                                    </select>
                                </div>
                            {/if}
                        </div>
                        <div class="flex flex-col">
                            <label
                                for="col-desc"
                                class="block text-xs font-bold text-slate-500 uppercase mb-1.5"
                                >Description</label
                            >
                            <textarea
                                id="col-desc"
                                bind:value={description}
                                placeholder="Describe the business flow (e.g. Order -> Payment -> Completion)..."
                                class="w-full flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all resize-none"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <!-- Steps Builder -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between mb-4">
                        <h2
                            class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider"
                        >
                            Business Flow Steps
                        </h2>
                        <span
                            class="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold"
                        >
                            {steps.length} Steps
                        </span>
                    </div>

                    <div
                        role="region"
                        aria-label="Collection steps sequence"
                        class="min-h-[400px] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-4 transition-colors"
                        class:bg-blue-50={false}
                        ondragover={(e) => {
                            e.preventDefault();
                            e.dataTransfer!.dropEffect = "move";
                        }}
                        ondrop={handleDrop}
                    >
                        {#each steps as step, i (step.id)}
                            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                            <div
                                draggable={draggableStepIndex === i}
                                onmousedown={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (target.closest(".drag-handle")) {
                                        draggableStepIndex = i;
                                    }
                                }}
                                onmouseup={() => (draggableStepIndex = null)}
                                onmouseleave={() => (draggableStepIndex = null)}
                                ondragstart={(e) => handleDragStart(e, i)}
                                ondragover={(e) => handleDragOver(e, i)}
                                ondrop={(e) => handleDropReorder(e, i)}
                                ondragend={handleDragEnd}
                                role="listitem"
                                class="transition-all rounded-xl {draggedStepIndex ===
                                i
                                    ? 'opacity-40 scale-[0.98] border-2 border-blue-400 border-dashed'
                                    : ''}"
                            >
                                <CollectionStepEditor
                                    bind:step={steps[i]}
                                    index={i}
                                    previousSteps={steps.slice(0, i)}
                                    onUpdate={(updatedStep) =>
                                        handleUpdateStep(i, updatedStep)}
                                    onRemove={() => handleRemoveStep(i)}
                                />
                            </div>
                        {/each}

                        {#if steps.length === 0}
                            <div
                                class="h-[300px] flex flex-col items-center justify-center text-center"
                            >
                                <div
                                    class="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4"
                                >
                                    <span
                                        class="material-symbols-outlined text-slate-400 text-[32px]"
                                        >add_task</span
                                    >
                                </div>
                                <h3
                                    class="text-sm font-semibold text-slate-900 dark:text-white mb-1"
                                >
                                    Build your flow
                                </h3>
                                <p class="text-xs text-slate-500 max-w-[240px]">
                                    Drag endpoints from the left sidebar and
                                    drop them here to create a sequential
                                    business flow.
                                </p>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>

<style>
    /* Prevent body scroll when FlowBuilder is active */
    :global(body) {
        overflow: hidden;
    }
</style>
