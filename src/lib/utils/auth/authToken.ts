import type { AuthToken } from "$lib/types/authToken";
import { MERCHANT_KEYS } from "$lib/utils/encryption/cryptoKeys";

// Date formatting helper: yyyy-mm-dd hh:mm:ss
const formatDate = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

// Generate 6-digit random number string
const generateUU = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Shift Operation Logic based on Prompt
const shiftUU = (uu: string): string => {
    if (uu.length !== 6) return uu;

    const firstDigit = parseInt(uu[0]);
    const shiftDirection = firstDigit % 2 !== 0 ? "LEFT" : "RIGHT";
    const shiftCount = parseInt(uu[1]);
    const targetStr = uu.substring(2); // index 2 to 5 (4 chars)

    // Shift targetStr (parsed as number) is tricky because it's a string part.
    // The prompt says "Se-beon-jjae bu-teo 6-beon-jjae ja-ri: Shift yeon-san su-haeng".
    // Assuming we treat the 4-digit substring as an integer and bitwise shift it?
    // Or shift the characters cyclically? 
    // "Shift yeon-san" usually implies bitwise operations on numbers.
    // Let's assume we parse the 4-digit substring as an integer, perform bitwise shift, and pads result back to string?
    // OR it might mean character rotation.
    // However, typical bitwise shift on a string number is ambiguous without more context.
    // But looking at "Shift yeon-san mobile bit su", it strongly suggests bitwise.
    // Let's parse the last 4 digits as an integer.

    let targetNum = parseInt(targetStr);

    // Bitwise shift in JS operates on 32-bit signed integers.
    // 4 digits (0-9999) fits easily.

    let shiftedNum = targetNum;

    if (shiftDirection === "LEFT") {
        shiftedNum = targetNum << shiftCount;
    } else {
        shiftedNum = targetNum >> shiftCount;
    }

    // The prompt doesn't specify how to handle the result format back into string (e.g. length).
    // It says "uu를 shift연산한 값".
    // I will return the string representation of the shifted number.
    return shiftedNum.toString();
};

// Generate Signature
const generateSgn = async (tokenData: Omit<AuthToken, "sgn">, hashKey: string): Promise<string> => {
    const { wpayUserKey, wtid, userId, createdAt, updatedAt, expiresAt, uu } = tokenData;

    const shiftedUU = shiftUU(uu);

    const rawString = `${wpayUserKey}${wtid}${userId}${createdAt}${updatedAt}${expiresAt}${shiftedUU}${hashKey}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(rawString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
};

export const createAuthToken = async (
    params: {
        server: any,
        site: string,
        service: string,
        wpayUserKey: string,
        wtid: string,
        userId: string,
        mid: string // need mid to find hashKey
    }
): Promise<AuthToken> => {
    const { server, site, service, wpayUserKey, wtid, userId, mid } = params;

    const now = new Date();
    const expires = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6 hours

    const createdAt = formatDate(now);
    const updatedAt = createdAt;
    const expiresAt = formatDate(expires);
    const uu = generateUU();

    // Get Hash Key
    const keys = MERCHANT_KEYS[mid];
    const hashKey = keys ? keys.hashKey : ""; // Should handle error or empty fallbak

    const tokenBase = {
        server,
        site,
        service,
        wpayUserKey,
        wtid,
        userId,
        createdAt,
        updatedAt,
        expiresAt,
        uu
    };

    const sgn = await generateSgn(tokenBase, hashKey);

    return {
        ...tokenBase,
        sgn
    };
};

export const validateAuthToken = async (token: AuthToken | null, mid: string): Promise<boolean> => {
    if (!token) return false;

    // 1. Check Expiration
    const now = new Date();
    const expires = new Date(token.expiresAt.replace(/-/g, "/")); // Cross-browser safe parsing?
    // Ideally use explicit parser if needed, but ISO-like usually works or standardized string
    // Format is yyyy-mm-dd hh:mm:ss. Replace space with T? or just compare strings if format is strictly same length?
    // Let's compare timestamps.
    // yyyy-mm-dd hh:mm:ss works in Date() in Chrome/modern browsers generally.
    if (now > expires) return false;

    // 2. Check Signature
    const keys = MERCHANT_KEYS[mid];
    const hashKey = keys ? keys.hashKey : "";

    const { sgn, ...rest } = token;
    const calculatedSgn = await generateSgn(rest, hashKey);

    return sgn === calculatedSgn;
};
