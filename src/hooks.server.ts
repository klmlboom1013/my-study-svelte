import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);

    // Fix for Firebase Auth popup closed by cross-origin policy
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    return response;
};
