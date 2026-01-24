import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { url, method, headers, body } = await request.json();

        if (!url) {
            return json({ error: 'Missing target URL' }, { status: 400 });
        }

        console.log(`Proxying ${method} request to: ${url}`);

        const response = await fetch(url, {
            method: method || 'GET',
            headers: headers || {},
            body: body || undefined
        });

        const status = response.status;
        const contentType = response.headers.get('content-type') || '';

        let responseData;
        if (contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        return json({
            status,
            data: responseData,
            headers: Object.fromEntries(response.headers.entries())
        });
    } catch (error: any) {
        console.error('Proxy error:', error);
        return json({ error: error.message }, { status: 500 });
    }
};
