export interface MembershipSearchParams {
    apiUrl: string;
    merchantId: string;
    userId: string;
    hNum: string;
}

export async function searchWpayMember(params: MembershipSearchParams): Promise<Record<string, any>> {
    const { apiUrl, merchantId, userId, hNum } = params;

    // Call Auth-specific API (for Login)
    const response = await fetch('/api/auth/wpay/membership', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            apiUrl,
            merchantId,
            userId,
            hNum
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Membership Check Failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data;
}
