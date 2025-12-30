
import type { RequestHandler } from './$types';

// Mock WPAY Registration Endpoint
export const POST: RequestHandler = async ({ request, url }) => {
    const formData = await request.formData();
    const returnUrl = formData.get('returnUrl')?.toString();

    if (!returnUrl) {
        return new Response("Missing returnUrl", { status: 400 });
    }

    // Mock successful registration
    const wpayUserKey = "MOCK_WPAY_USER_KEY_" + Date.now();
    const resultCode = "0000";
    const resultMsg = "Success";
    const signature = "MOCK_SIGNATURE"; // In real world this should be generated

    // Construct callback URL
    const callbackUrl = new URL(returnUrl);
    callbackUrl.searchParams.set('resultCode', resultCode);
    callbackUrl.searchParams.set('resultMsg', resultMsg);
    callbackUrl.searchParams.set('wpayUserKey', wpayUserKey);
    callbackUrl.searchParams.set('signature', signature);
    callbackUrl.searchParams.set('mid', formData.get('mid')?.toString() || '');
    callbackUrl.searchParams.set('userId', formData.get('userId')?.toString() || '');

    // Redirect to callback
    return new Response(null, {
        status: 302,
        headers: {
            'Location': callbackUrl.toString()
        }
    });
};
