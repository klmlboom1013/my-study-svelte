import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
    // Client sends the full target URL as a query parameter 'url'
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return json({
            resultCode: "9999",
            resultMsg: "Missing target URL parameter"
        }, { status: 400 });
    }

    try {
        console.log(`[Proxy] Forwarding request to: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        const status = response.status;
        const text = await response.text();

        console.log(`[Proxy] Response Status: ${status}`);
        console.log(`[Proxy] Response Body: ${text}`);

        if (!response.ok) {
            return json({
                resultCode: "9999",
                resultMsg: `Upstream API Error: ${status} ${response.statusText}`
            }, { status: status });
        }

        try {
            const data = JSON.parse(text);
            return json(data);
        } catch (parseError) {
            console.error("[Proxy] JSON Parse Error:", parseError);
            return json({
                resultCode: "9999",
                resultMsg: "Invalid JSON response from upstream"
            }, { status: 500 });
        }

    } catch (e) {
        console.error("[Proxy] Request Failed:", e);
        return json({
            resultCode: "9999",
            resultMsg: `Internal Server Error: ${e instanceof Error ? e.message : String(e)}`
        }, { status: 500 });
    }
};
