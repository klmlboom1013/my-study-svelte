/**
 * Service dedicated to WPAY Endpoint Execution (API Testing / Sandbox)
 */
export const wpayExecutionService = {
    /**
     * Open a centered popup for WPAY Execution testing
     */
    openPopup: (width: number, height: number, target: string) => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            return window.open("", target);
        } else {
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            return window.open(
                "",
                target,
                `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
            );
        }
    },

    /**
     * Submit a test form to the specified target (popup)
     */
    submitForm: (action: string, method: string, target: string, payload: Record<string, string>) => {
        const form = document.createElement("form");
        form.action = action;
        form.method = method;
        form.target = target;

        Object.entries(payload).forEach(([key, value]) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = String(value || "");
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }
};
