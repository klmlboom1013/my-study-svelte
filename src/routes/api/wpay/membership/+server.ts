import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { wpayServerService } from '$lib/server/services/wpayService';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { apiUrl, merchantId, userId, hNum } = body;

        if (!apiUrl || !merchantId) {
            return json({ resultCode: "9999", resultMsg: "Missing parameters" }, { status: 400 });
        }

        // 1. Encrypt Data
        // userId: "로그인 페이지에서 입력한 Member ID 또는 ... 빈 값인 경우 wpayTestUser01"
        const encUserId = userId ? wpayServerService.encrypt(userId, merchantId) : "";
        const encHNum = hNum ? wpayServerService.encrypt(hNum, merchantId) : "";
        const finalCi = ""; // Always empty

        const reqData: Record<string, string> = {
            mid: merchantId,
            ci: finalCi,
            userId: encUserId,
            hNum: encHNum,
        };

        // 2. Generate Signature
        const signingOrder = ["mid", "ci", "userId", "hNum"];
        const { signature } = await wpayServerService.sign(reqData, merchantId, signingOrder);
        reqData.signature = signature;

        // 3. Build Query String
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(reqData)) {
            searchParams.append(key, value);
        }

        // 4. API Call
        const targetUrl = `${apiUrl}?${searchParams.toString()}`;
        console.log(`[WPAY Membership API] Calling: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        const text = await response.text();
        console.log(`[WPAY Membership API] Response: ${text}`);

        if (!response.ok) {
            throw new Error(`External API Call Failed: ${response.status}`);
        }

        const resData = JSON.parse(text);

        // 5. Decrypt necessary fields if success
        // Clients need wpayUserKey decrypted. resultMsg might be encrypted?
        // Guide: "resultMsg": "결과 메시지 (URL Encoding)", "wpayUserKey": "WPAY 사용자 키 (SEED 암호화)"

        let decryptedData = { ...resData };

        // Decrypt wpayUserKey if present
        if (resData.wpayUserKey) {
            try {
                decryptedData.wpayUserKey = wpayServerService.decrypt(resData.wpayUserKey, merchantId);
            } catch (e) {
                console.error("Failed to decrypt wpayUserKey", e);
            }
        }

        // Decrypt resultMsg if needed (usually it is URL encoded, but sometimes encrypted. Guide says URL Encoding, but let's check legacy code)
        // Original code: decrypted.resultMsg = wpayAuthService.decryptResult...
        // Actually wpayAuthService.decryptResult attempts to decrypt specific fields.
        // Let's look at legacy decryptResult:
        // fields to decrypt: ["resultMsg", "wpayUserKey", "userId", "wtid"]

        const fieldsToDecrypt = ["resultMsg", "wpayUserKey", "userId", "wtid"];
        for (const field of fieldsToDecrypt) {
            if (resData[field]) {
                try {
                    // Try to decrypt. If it fails (e.g. not encrypted or plain text), keep original?
                    // Safe approach: Some fields like resultMsg might be just URL encoded if not encrypted.
                    // But if standard says Seed Encrypted, we decrypt.
                    // Let's assume standard behavior: decrypt.
                    const val = wpayServerService.decrypt(resData[field], merchantId);
                    decryptedData[field] = val; // Overwrite with decrypted
                } catch (e) {
                    // console.warn(`Field ${field} decryption failed or not necessary.`);
                    // If decryption fails, it might be plain text or just URL encoded.
                    // resultMsg is URL encoded usually.
                    if (field === "resultMsg") {
                        try {
                            decryptedData[field] = decodeURIComponent(resData[field]);
                        } catch { }
                    }
                }
            }
        }

        return json(decryptedData);

    } catch (e) {
        console.error("[WPAY Membership API] Error:", e);
        return json({ resultCode: "9999", resultMsg: (e as Error).message }, { status: 500 });
    }
};
