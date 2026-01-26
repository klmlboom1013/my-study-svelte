import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { wpayServerService } from '$lib/server/services/wpayService';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { type, mid, ...params } = body;

        // params contains clear-text data needed for payload

        if (!mid) return json({ error: "Missing MID" }, { status: 400 });

        let payload: Record<string, string> = { mid };
        let signingOrder: string[] = [];
        let encodeFields: string[] = [];

        if (type === 'signup') {
            // Params: userId, returnUrl
            const encUserId = wpayServerService.encrypt(params.userId, mid);

            payload = {
                mid,
                userId: encUserId,
                ci: "",
                userNm: "",
                hNum: "",
                hCorp: "",
                birthDay: "",
                socialNo2: "",
                frnrYn: "",
                returnUrl: params.returnUrl // Already encoded or expected to be encoded? 
                // In SigninForm: returnUrl: encodeURIComponent(...) => passed as param
            };

            signingOrder = [
                "mid", "userId", "ci", "userNm", "hNum", "hCorp",
                "birthDay", "socialNo2", "frnrYn", "returnUrl"
            ];
            // No encodeFields needed if returnUrl is passed already encoded.
            // SigninForm.svelte passes encoded returnUrl.

        } else if (type === 'pin_auth') {
            // Params: wpayUserKey, returnUrl
            // wpayUserKey is already encrypted? No, usually clear text in DB, but api expects...?
            // Wait, wpayUserKey in payload.
            // Guide: "wpayUserKey": "WPAY 사용자 키" (Plain text or Encrypted?)
            // Usually wpayUserKey is public identifier (token-like), not encrypted in request unless specified.
            // Guide Check:
            // PIN Auth Payload: wpayUserKey (encrypt: X)
            // So we use it as is.

            payload = {
                mid,
                wpayUserKey: params.wpayUserKey,
                ci: "",
                returnUrl: params.returnUrl
            };

            signingOrder = ["mid", "wpayUserKey", "ci", "returnUrl"];
        } else {
            return json({ error: "Invalid type" }, { status: 400 });
        }

        const { signature } = await wpayServerService.sign(payload, mid, signingOrder, encodeFields);
        payload.signature = signature;

        return json(payload);

    } catch (e) {
        console.error("[WPAY Sign API] Error:", e);
        return json({ error: (e as Error).message }, { status: 500 });
    }
};
