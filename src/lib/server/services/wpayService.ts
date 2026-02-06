import { SERVER_MERCHANT_KEYS } from '$lib/server/wpayKeys';
import { encryptSeed, decryptSeed } from '$lib/utils/encryption/cryptoSeed';
import { generateSignature } from '$lib/utils/security';

// Re-export or wrap utilities to use server keys automatically

export const wpayServerService = {
    encrypt: (text: string, mid: string) => {
        const keys = SERVER_MERCHANT_KEYS[mid];
        if (!keys) throw new Error("Invalid MID");
        if (!keys.seedKey || !keys.seedIV) throw new Error("Missing Seed Key/IV");
        return encryptSeed(text, keys.seedKey, keys.seedIV);
    },

    decrypt: (encryptedText: string, mid: string) => {
        const keys = SERVER_MERCHANT_KEYS[mid];
        if (!keys) throw new Error("Invalid MID");
        if (!keys.seedKey || !keys.seedIV) throw new Error("Missing Seed Key/IV");
        return decryptSeed(encryptedText, keys.seedKey, keys.seedIV);
    },

    sign: async (data: Record<string, string>, mid: string, order: string[], encodeFields: string[] = []) => {
        const keys = SERVER_MERCHANT_KEYS[mid];
        if (!keys) throw new Error("Invalid MID");
        if (!keys.hashKey) throw new Error("Missing Hash Key");

        const fields = order.map((name, index) => ({ name, signingOrder: index + 1 }));
        const context = { hashKey: keys.hashKey };
        const result = await generateSignature(data, fields, 'HMAC_SHA256_KV', context);
        return result.signature;
    },

    getHashKey: (mid: string) => {
        const keys = SERVER_MERCHANT_KEYS[mid];
        if (!keys) throw new Error("Invalid MID");
        return keys.hashKey;
    }
};
