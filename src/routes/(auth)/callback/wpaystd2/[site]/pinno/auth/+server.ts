import type { RequestHandler } from './$types';

const generateResponse = (data: any) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Processing...</title>
        </head>
        <body>
            <script>
                const data = ${JSON.stringify(data)};
                console.log("WPAY PIN Auth Callback Data:", data);
                
                // 1. PostMessage (Standard)
                if (window.opener) {
                    try {
                        window.opener.postMessage(data, "*");
                    } catch (e) {
                        console.error("PostMessage failed:", e);
                    }
                }

                // 2. LocalStorage (Cross-tab fallback)
                try {
                    localStorage.setItem('wpay_auth_result', JSON.stringify(data));
                } catch (e) {
                     console.error("LocalStorage write failed:", e);
                }

                // 3. BroadcastChannel (Modern cross-tab)
                try {
                    const channel = new BroadcastChannel("wpay_auth_channel");
                    channel.postMessage(data);
                    channel.close();
                } catch (e) {}

                // 4. Cookie (Legacy fallback)
                try {
                    const jsonStr = JSON.stringify(data);
                    document.cookie = "wpay_bridge_data=" + encodeURIComponent(jsonStr) + "; path=/; max-age=60; samesite=lax";
                } catch (e) {
                     console.error("Cookie write failed:", e);
                }

                // Close immediately
                window.close();
            </script>
        </body>
        </html>
    `;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html'
        }
    });
};

export const GET: RequestHandler = async ({ url }) => {
    const data = {
        resultCode: url.searchParams.get('resultCode') || '',
        resultMsg: url.searchParams.get('resultMsg') || '',
        mid: url.searchParams.get('mid') || '',
        wtid: url.searchParams.get('wtid') || '',
        wpayUserKey: url.searchParams.get('wpayUserKey') || '',
        userId: url.searchParams.get('userId') || '',
        signature: url.searchParams.get('signature') || ''
    };
    console.log("SERVER GET /pinno/auth:", data);
    return generateResponse(data);
};

export const POST: RequestHandler = async ({ request, cookies }) => {
    const formData = await request.formData();
    const data = {
        resultCode: formData.get('resultCode')?.toString() || '',
        resultMsg: formData.get('resultMsg')?.toString() || '',
        mid: formData.get('mid')?.toString() || '',
        wtid: formData.get('wtid')?.toString() || '',
        wpayUserKey: formData.get('wpayUserKey')?.toString() || '',
        userId: formData.get('userId')?.toString() || '',
        signature: formData.get('signature')?.toString() || '',
    };

    // Server-Side Cookie (Robust)
    cookies.set("wpay_bridge_data", JSON.stringify(data), {
        path: "/",
        httpOnly: false, // Ensure JS can read it
        sameSite: "lax",
        maxAge: 60 // 1 minute
    });

    console.log("SERVER POST /pinno/auth:", data);
    return generateResponse(data);
};
