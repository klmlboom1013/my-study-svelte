import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { tokenService } from '$lib/server/services/tokenService';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        // Body should match params expected by tokenService.createAccessToken
        const token = await tokenService.createAccessToken(body);
        return json({ token });
    } catch (e) {
        console.error("Token Creation Failed", e);
        return json({ error: (e as Error).message }, { status: 500 });
    }
};
