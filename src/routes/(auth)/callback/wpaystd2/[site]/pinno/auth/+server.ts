
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
                
                // Send to parent/opener
                const target = window.opener || window.parent;
                if (target) {
                    target.postMessage(data, "*");
                } else {
                    console.error("No parent window found to send data to.");
                }
            </script>
            <p>Processing PIN Auth result... Please wait.</p>
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
        signature: url.searchParams.get('signature') || ''
    };

    return generateResponse(data);
};

export const POST: RequestHandler = async ({ request }) => {
    const formData = await request.formData();
    const data = {
        resultCode: formData.get('resultCode')?.toString() || '',
        resultMsg: formData.get('resultMsg')?.toString() || '',
        mid: formData.get('mid')?.toString() || '',
        wtid: formData.get('wtid')?.toString() || '',
        wpayUserKey: formData.get('wpayUserKey')?.toString() || '',
        signature: formData.get('signature')?.toString() || ''
    };

    return generateResponse(data);
};
