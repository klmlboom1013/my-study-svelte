/**
 * Service dedicated to WPAY Authentication (Signin/Signup)
 * UI Helpers only. Encryption/Verification moved to Server API.
 */
export const wpayAuthService = {
    /**
     * Open a centered popup for WPAY Authentication
     */
    openPopup: (width: number, height: number) => {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const target = "wpay-auth-popup";

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
     * Submit an authentication form to the WPAY popup
     */
    /**
     * Legacy support if needed, or remove if unused.
     */
    submitForm: (action: string, method: string, payload: Record<string, string>) => {
        // Re-implementation for when we don't have the window reference but rely on target="wpay-auth-popup"
        const form = document.createElement("form");
        form.action = action;
        form.method = method;
        form.target = "wpay-auth-popup";

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
