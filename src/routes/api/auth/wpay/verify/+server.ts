import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { wpayServerService } from '$lib/server/services/wpayService';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { resData } = body; // The full response object from WPAY

        if (!resData || !resData.mid) {
            return json({ isSigValid: false, message: "Missing response data" });
        }

        const mid = resData.mid;

        // Determine signing order based on response type (Auth vs Pin)
        // Similar logic to SigninForm.svelte
        const isPinAuth = !resData.userId && !resData.ci;
        const order = isPinAuth
            ? ["resultCode", "resultMsg", "mid", "wtid", "wpayUserKey"]
            : [
                "resultCode",
                "resultMsg",
                "mid",
                "wtid",
                "userId",
                "wpayUserKey",
                "ci",
            ];

        // Verify Signature
        const { signature } = await wpayServerService.sign(resData, mid, order);

        // Compare generated signature with resData.signature
        if (signature !== resData.signature) {
            return json({ isSigValid: false });
        }

        // Decrypt Data
        const decryptedData = { ...resData };
        const fieldsToDecrypt = ["resultMsg", "wpayUserKey", "userId", "wtid"];

        for (const field of fieldsToDecrypt) {
            if (resData[field]) {
                try {
                    decryptedData[field] = wpayServerService.decrypt(resData[field], mid);
                } catch (e) {
                    if (field === "resultMsg") {
                        try {
                            decryptedData[field] = decodeURIComponent(resData[field]);
                        } catch { }
                    }
                }
            }
        }

        return json({ isSigValid: true, decrypted: decryptedData });

    } catch (e) {
        console.error("[WPAY Verify API] Error:", e);
        return json({ isSigValid: false, error: (e as Error).message }, { status: 500 });
    }
};
