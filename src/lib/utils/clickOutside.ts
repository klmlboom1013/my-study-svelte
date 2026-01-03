import { browser } from '$app/environment';

export function clickOutside(node: HTMLElement, onOutsideClick: () => void) {
    if (!browser) {
        return { destroy() { } };
    }

    const handleClick = (event: MouseEvent) => {
        if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
            onOutsideClick();
        }
    };

    document.addEventListener('click', handleClick, true);

    return {
        destroy() {
            document.removeEventListener('click', handleClick, true);
        }
    };
}
