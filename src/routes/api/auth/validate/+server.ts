import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { tokenService } from '$lib/server/services/tokenService';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { token, mid } = await request.json();
        if (!token || !mid) {
            return json({ isValid: false }, { status: 400 });
        }
        const isValid = await tokenService.validateAccessToken(token, mid);
        return json({ isValid });
    } catch (e) {
        console.error("Token Validation Failed", e);
        return json({ isValid: false }, { status: 500 });
    }
};
