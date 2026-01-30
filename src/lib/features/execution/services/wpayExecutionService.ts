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
            console.log("wpayExecution: Opening for Mobile", target);
            return window.open("about:blank", target);
        } else {
            console.log("wpayExecution: Opening centered popup", target);
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;
            const win = window.open(
                "about:blank",
                target,
                `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
            );
            if (win) win.focus();
            return win;
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

        console.log("wpayExecution: Submitting form to target:", target, "Action:", action);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    },

    /**
     * Submit a form directly inside the popup window (Direct Injection).
     * This is more reliable for fresh windows as it avoids name resolution issues.
     */
    submitToWindow: (win: Window, action: string, method: string, payload: Record<string, string>) => {
        try {
            const doc = win.document;
            const form = doc.createElement("form");
            form.action = action;
            form.method = method;

            Object.entries(payload).forEach(([key, value]) => {
                const input = doc.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = String(value || "");
                form.appendChild(input);
            });

            console.log("wpayExecution: Direct submitting to window", action);
            doc.body.appendChild(form);
            form.submit();
            // We cannot remove child here reliably because the page will navigate away immediately
        } catch (e) {
            console.error("wpayExecution: Direct submission failed", e);
            // Fallback? No, if this fails, likely permission denied or window closed.
        }
    }
};
