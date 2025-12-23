import { generateSignature } from "$lib/utils/wpay/signature";
import { encryptSeed } from "$lib/utils/encryption/cryptoSeed";
import { MERCHANT_KEYS } from "$lib/utils/encryption/cryptoKeys";

export interface MembershipSearchParams {
    domain: string;
    siteName: string;
    merchantId: string;
    userId: string;
    hNum: string;
}

export async function searchWpayMember(params: MembershipSearchParams): Promise<Record<string, any>> {
    const { domain, siteName, merchantId, userId, hNum } = params;
    const keys = MERCHANT_KEYS[merchantId];

    if (!keys) {
        throw new Error(`Merchant Keys not found for merchantId: ${merchantId}`);
    }

    // 1. Prepare Request Data
    // Signing Order: mid, ci, userId, hNum (Fixed order as per guide 1. WPAY 회원 가입 정보 조회.md)
    const signingOrder = ["mid", "ci", "userId", "hNum"];

    // Encrypt Data
    // userId: "로그인 페이지에서 입력한 Member ID 또는 ... 빈 값인 경우 wpayTestUser01" (Handled by caller)
    // ci: "빈 값으로 세팅"
    const encUserId = encryptSeed(userId, keys.seedKey, keys.seedIV);
    const encHNum = encryptSeed(hNum, keys.seedKey, keys.seedIV);
    const encCi = ""; // Empty string encrypted? No, "빈 값으로 세팅" usually means empty string.
    // And guide says "Encrypt: O".
    // If value is empty, do we encrypt it?
    // Guide says "ci ... 빈 값으로 세팅".
    // Ideally encrypt("") -> but usually empty string means "skip" or just empty.
    // Let's assume encrypt("") gives cipher text.
    // But usually if it's optional and empty, we just send empty.
    // Let's check guide: "ci ... 빈 값으로 세팅". "Encrypt: O".
    // Most likely: `mid=...&ci=&userId=...` in signature.
    // And in param: `mid=...&ci=&...`
    // I'll send empty string plain. Encrypting empty string is unusual unless specified "Encrypt empty string".
    // I will leave it empty string.

    // Guide says "ci" type "String", Encrypt "O".
    let finalCi = "";
    if (finalCi) {
        finalCi = encryptSeed(finalCi, keys.seedKey, keys.seedIV);
    }

    const reqData: Record<string, string> = {
        mid: merchantId,
        ci: finalCi,
        userId: encUserId,
        hNum: encHNum,
    };

    // Generate Signature
    // "Request Data의 row 중 Signing Order 컬럼에 값이 존재하는 필드만 signature를 생성하는데 사용 된다."
    // Signing Order: 1: mid, 2: ci, 3: userId, 4: hNum
    // Even if ci is empty, if it's in signing order, it's included as "ci="
    const { signature } = await generateSignature(reqData, keys.hashKey, signingOrder);
    reqData.signature = signature;

    // 2. Build Query String
    const searchParams = new URLSearchParams();
    // Ensure all keys are appended, including empty ones if needed
    // URLSearchParams will encode values automatically.
    for (const [key, value] of Object.entries(reqData)) {
        searchParams.append(key, value);
    }

    // 3. API Call
    // URI: /{site name}/apis/schMemRegInfo
    const targetUrl = `${domain}/${siteName}/apis/schMemRegInfo?${searchParams.toString()}`;

    // Proxy URL (Local SvelteKit Server)
    const proxyUrl = `/api/wpay/membership?url=${encodeURIComponent(targetUrl)}`;

    console.log(`[WPAY Membership Check] Proxy Request -> ${targetUrl}`);
    console.log(`[WPAY Membership Check] GET ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        },
    });

    console.log(`[WPAY Membership Check] Response Status: ${response.status}`);
    const text = await response.text();
    console.log(`[WPAY Membership Check] Raw Response Body: ${text}`);

    if (!response.ok) {
        throw new Error(`API Call Failed: ${response.status} ${response.statusText} - ${text}`);
    }

    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        throw new Error("Invalid JSON Response");
    }

    console.log("[WPAY Membership Check] Response Data:", data);
    return data;
}
