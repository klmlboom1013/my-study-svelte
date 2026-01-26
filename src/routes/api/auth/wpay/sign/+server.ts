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
            const encWpayUserKey = wpayServerService.encrypt(params.wpayUserKey, mid);

            payload = {
                mid,
                wpayUserKey: encWpayUserKey,
                ci: "",
                returnUrl: params.returnUrl
            };

            signingOrder = ["mid", "wpayUserKey", "ci", "returnUrl"];
            // Important: wpayUserKey MUST NOT be URL encoded as per user request.
            // Since encodeFields is empty, it won't be encoded.
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
