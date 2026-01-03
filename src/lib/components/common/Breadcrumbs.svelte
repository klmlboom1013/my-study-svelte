<script lang="ts">
    import { goto } from "$app/navigation";

    type BreadcrumbItem = {
        label: string;
        href?: string;
    };

    let { items }: { items: BreadcrumbItem[] } = $props();
</script>

<nav class="flex items-center text-sm font-medium mb-4" aria-label="Breadcrumb">
    <ol class="inline-flex items-center space-x-1 md:space-x-3">
        {#each items as item, i}
            <li class="inline-flex items-center">
                {#if i > 0}
                    <span
                        class="material-symbols-outlined text-slate-400 text-[16px] mx-1"
                    >
                        chevron_right
                    </span>
                {/if}

                {#if item.href && i < items.length - 1}
                    <button
                        onclick={() => goto(item.href!)}
                        class="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        {item.label}
                    </button>
                {:else}
                    <span class="text-slate-900 dark:text-white font-semibold">
                        {item.label}
                    </span>
                {/if}
            </li>
        {/each}
    </ol>
</nav>
