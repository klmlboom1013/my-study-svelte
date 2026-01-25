import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { url, method, headers, body } = await request.json();

        if (!url) {
            throw error(400, 'Missing url parameter');
        }

        // Clean headers to avoid conflicts
        const cleanHeaders: Record<string, string> = { ...headers };
        delete cleanHeaders['host'];
        delete cleanHeaders['origin'];
        delete cleanHeaders['referer'];
        delete cleanHeaders['content-length'];

        const fetchOptions: RequestInit = {
            method: method || 'GET',
            headers: cleanHeaders,
            body: body ? body : undefined
        };

        const response = await fetch(url, fetchOptions);
        const responseBody = await response.text();

        // Create response headers map
        const responseHeaders = new Headers();
        if (response.headers.has('content-type')) {
            responseHeaders.set('content-type', response.headers.get('content-type')!);
        }

        return new Response(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });

    } catch (e) {
        console.error('Proxy Error:', e);
        throw error(500, `Proxy Request Failed: ${(e as Error).message}`);
    }
};
