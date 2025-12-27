import type { AccessToken } from "$lib/types/accessToken";
import { MERCHANT_KEYS } from "$lib/utils/encryption/cryptoKeys";
import { SignJWT, jwtVerify } from "jose";

// Generate 6-digit random number string
const generateUU = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createAccessToken = async (
    params: {
        server: any,
        site: string,
        service: string,
        wpayUserKey: string,
        wtid: string,
        userId: string,
        mid: string // need mid to find hashKey
    }
): Promise<string> => {
    const { server, site, service, wpayUserKey, wtid, userId, mid } = params;

    // Get Hash Key
    const keys = MERCHANT_KEYS[mid];
    const hashKeyString = keys ? keys.hashKey : "";
    const secret = new TextEncoder().encode(hashKeyString);

    const uu = generateUU();

    const payload: AccessToken = {
        server,
        site,
        service,
        wpayUserKey,
        wtid,
        // userId maps to sub claim
        uu,
        mid
    };

    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer('my_study_svelte')
        .setSubject(userId)
        .setExpirationTime('6h')
        .sign(secret);

    return token;
};

export const validateAccessToken = async (token: string | null, mid: string): Promise<boolean> => {
    if (!token) return false;

    // Get Hash Key
    const keys = MERCHANT_KEYS[mid];
    const hashKeyString = keys ? keys.hashKey : "";
    const secret = new TextEncoder().encode(hashKeyString);

    try {
        const { payload } = await jwtVerify(token, secret, {
            issuer: 'my_study_svelte',
            algorithms: ['HS256'] // Explicitly require HS256 as per prompt
        });

        // Additional checks if necessary (e.g. check if mid matches or claims exist)
        return true;
    } catch (e) {
        // console.error("JWT Validation Failed", e);
        return false;
    }
};
