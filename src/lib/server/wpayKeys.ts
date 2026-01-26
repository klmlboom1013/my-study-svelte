import { env } from '$env/dynamic/private';

export const SERVER_MERCHANT_KEYS: Record<string, { seedKey: string; seedIV: string; hashKey: string }> = {
    "INIwpayT03": {
        seedKey: env.WPAY_SEED_KEY,
        seedIV: env.WPAY_SEED_IV,
        hashKey: env.WPAY_HASH_KEY,
    }
};
