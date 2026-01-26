import { SERVER_MERCHANT_KEYS } from '$lib/server/wpayKeys';
import { encryptSeed, decryptSeed } from '$lib/utils/encryption/cryptoSeed';
import { generateSignature } from '$lib/utils/wpay/signature';

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

        return await generateSignature(data, keys.hashKey, order, encodeFields);
    },

    getHashKey: (mid: string) => {
        const keys = SERVER_MERCHANT_KEYS[mid];
        if (!keys) throw new Error("Invalid MID");
        return keys.hashKey;
    }
};
