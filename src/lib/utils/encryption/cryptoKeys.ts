export interface CryptoKeys {
    seedKey: string;
    seedIV: string;
    hashKey: string;
}

export const MERCHANT_KEYS: Record<string, CryptoKeys> = {
    "INIwpayT03": {
        seedKey: "rClo7QA4gdgyITHAPWrfXw==",
        seedIV: "WPAYSTDWPAY00000",
        hashKey: "F3149950A7B6289723F325833F588STD",
    },
} as const;
