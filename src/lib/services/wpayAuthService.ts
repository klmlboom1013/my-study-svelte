import { decryptSeed } from "$lib/utils/encryption/cryptoSeed";
import { generateSignature } from "$lib/utils/wpay/signature";

export interface WpayAuthContext {
    hashKey: string;
    seedKey: string;
    seedIV: string;
}

export interface DecryptedWpayAuthResult {
    resultCode: string;
    resultMsg: string;
    mid: string;
    wtid: string;
    wpayUserKey: string;
    signature: string;
    userId?: string;
    ci?: string;
}

/**
 * Service dedicated to WPAY Authentication (Signin/Signup)
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
    submitForm: (action: string, method: string, payload: Record<string, string>) => {
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
    },

    /**
     * Decrypt and decode WPAY authentication result
     */
    decryptResult: (resData: any, context: WpayAuthContext): DecryptedWpayAuthResult => {
        const decrypt = (val: string) => val ? decryptSeed(val, context.seedKey, context.seedIV) : "";
        const decode = (val: string) => val ? decodeURIComponent(val).replace(/\+/g, " ") : "";

        return {
            resultCode: resData.resultCode,
            resultMsg: decode(resData.resultMsg || ""),
            mid: resData.mid || "",
            wtid: resData.wtid || "",
            wpayUserKey: decrypt(resData.wpayUserKey || ""),
            userId: decrypt(resData.userId || ""),
            ci: decrypt(resData.ci || ""),
            signature: resData.signature || ""
        };
    },

    /**
     * Verify the signature of a WPAY authentication response
     */
    verifySignature: async (resData: any, hashKey: string, order: string[]) => {
        if (!resData.signature) return true;
        const { signature } = await generateSignature(resData, hashKey, order);
        return signature === resData.signature;
    }
};
