
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
                console.log("WPAY Callback Data:", data);
                
                // Send to parent/opener
                    // 1. PostMessage (Legacy/Standard)
                    if (window.opener) {
                        try {
                            window.opener.postMessage(data, "*");
                        } catch (e) {
                            console.error("PostMessage failed:", e);
                        }
                    }

                    }

                    // 3. LocalStorage (Safe cross-tab fallback)
                    try {
                        localStorage.setItem('wpay_auth_result', JSON.stringify(data));
                    } catch (e) {
                         console.error("LocalStorage write failed:", e);
                    }

                    // Close the window
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                } else {
                    console.error("No parent window found to send data to.");

                    // Try BroadcastChannel & LocalStorage even if no opener
                    try {
                        const channel = new BroadcastChannel("wpay_auth_channel");
                        channel.postMessage(data);
                        channel.close();
                    } catch (e) {}

                    } catch (e) {}

                    // 4. Cookie (Oldest & Most compatible fallback)
                    try {
                        const jsonStr = JSON.stringify(data);
                        // Set cookie valid for 1 minute, strict path
                        document.cookie = "wpay_bridge_data=" + encodeURIComponent(jsonStr) + "; path=/; max-age=60; samesite=lax";
                    } catch (e) {
                         console.error("Cookie write failed:", e);
                    }
                    
                    setTimeout(() => {
                       window.close();
                    }, 3000);
                }
            </script>
            </script>
            <div style="font-family: sans-serif; text-align: center; padding: 40px 20px;">
                <h2 style="color: #4CAF50;">Registration Complete</h2>
                <p style="color: #666; margin: 20px 0;">You can now safely close this window.</p>
                <button onclick="window.close()" style="padding: 10px 20px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Close Window</button>
            </div>
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
        wpayUserKey: url.searchParams.get('wpayUserKey') || '',
        mid: url.searchParams.get('mid') || '',
        userId: url.searchParams.get('userId') || '',
        wtid: url.searchParams.get('wtid') || '',
        ci: url.searchParams.get('ci') || '',
        signature: url.searchParams.get('signature') || ''
    };
    console.log("SERVER GET /memreg:", data);
    return generateResponse(data);
};

export const POST: RequestHandler = async ({ request, cookies }) => {
    const formData = await request.formData();
    const data = {
        resultCode: formData.get('resultCode')?.toString() || '',
        resultMsg: formData.get('resultMsg')?.toString() || '',
        wpayUserKey: formData.get('wpayUserKey')?.toString() || '',
        mid: formData.get('mid')?.toString() || '',
        userId: formData.get('userId')?.toString() || '',
        wtid: formData.get('wtid')?.toString() || '',
        ci: formData.get('ci')?.toString() || '',
        signature: formData.get('signature')?.toString() || ''
    };

    // Server-Side Cookie (Robust)
    cookies.set("wpay_bridge_data", JSON.stringify(data), {
        path: "/",
        httpOnly: false, // Ensure JS can read it
        sameSite: "lax",
        maxAge: 60 // 1 minute
    });

    console.log("SERVER POST /memreg:", data);
    return generateResponse(data);
};
