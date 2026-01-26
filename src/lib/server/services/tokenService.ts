import { SignJWT, jwtVerify } from "jose";
import { SERVER_MERCHANT_KEYS } from "$lib/server/wpayKeys";

// Generate 6-digit random number string
const generateUU = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const tokenService = {
    createAccessToken: async (params: {
        server: any;
        service: string;
        wpayUserKey: string;
        wtid: string;
        userId: string;
        mid: string;
    }): Promise<string> => {
        const { server, service, wpayUserKey, wtid, userId, mid } = params;

        const keys = SERVER_MERCHANT_KEYS[mid];
        if (!keys) throw new Error("Invalid MID");

        const hashKeyString = keys.hashKey;
        const secret = new TextEncoder().encode(hashKeyString);

        const uu = generateUU();

        const payload = {
            server,
            service,
            wpayUserKey,
            wtid,
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
    },

    validateAccessToken: async (token: string, mid: string): Promise<boolean> => {
        const keys = SERVER_MERCHANT_KEYS[mid];
        if (!keys) return false;

        const hashKeyString = keys.hashKey;
        const secret = new TextEncoder().encode(hashKeyString);

        try {
            await jwtVerify(token, secret, {
                issuer: 'my_study_svelte',
                algorithms: ['HS256']
            });
            return true;
        } catch (e) {
            return false;
        }
    }
};
