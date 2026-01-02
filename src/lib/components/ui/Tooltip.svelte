<script lang="ts">
    import { fade } from "svelte/transition";

    interface Props {
        text: string;
        position?: "top" | "bottom" | "left" | "right" | "bottom-end";
        delay?: number;
        children?: import("svelte").Snippet;
    }

    let { text, position = "bottom", delay = 200, children }: Props = $props();

    let isVisible = $state(false);
    let timeoutId: ReturnType<typeof setTimeout>;

    function handleMouseEnter() {
        timeoutId = setTimeout(() => {
            isVisible = true;
        }, delay);
    }

    function handleMouseLeave() {
        clearTimeout(timeoutId);
        isVisible = false;
    }

    // Position Classes Map
    const positionClasses = {
        top: "-top-2 left-1/2 -translate-x-1/2 -translate-y-full mb-2",
        bottom: "-bottom-2 left-1/2 -translate-x-1/2 translate-y-full mt-2",
        left: "-left-2 top-1/2 -translate-y-1/2 -translate-x-full mr-2",
        right: "-right-2 top-1/2 -translate-y-1/2 translate-x-full ml-2",
        "bottom-end": "-bottom-2 right-0 translate-y-full mt-2",
    };
</script>

<div
    class="relative inline-flex"
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    role="tooltip"
>
    {@render children?.()}

    {#if isVisible}
        <div
            class="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded shadow-lg whitespace-nowrap pointer-events-none {positionClasses[
                position
            ]}"
            transition:fade={{ duration: 150 }}
        >
            {text}
            <!-- Arrow (Optional, keeping simple for now) -->
        </div>
    {/if}
</div>
