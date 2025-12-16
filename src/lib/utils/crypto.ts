import { Buffer } from 'buffer';

if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
    (window as any).Buffer = Buffer;
}

import { KISA_SEED_CBC } from '@kr-yeon/kisa-seed';

// 128-bit key (16 bytes) - Test Key
// In production, load this from environment variables (e.g., $env/static/private)
const SECRET_KEY_BASE64 = '1234567890123456789012=='; // 24 chars base64 ~= 16 bytes? No. 
// 16 bytes = 128 bits. 
// Base64 encodes 3 bytes into 4 chars. 16 bytes -> ceil(16/3)*4 = 6*4 = 24 chars.
// Let's use a proper 16-byte base64 key.
// 'AAECAwQFBgcICQoLDA0ODw==' is 0x00..0x0F

// 128-bit key (16 bytes)
const DEFAULT_KEY = 'rClo7QA4gdgyITHAPWrfXw==';
// IV is 16 bytes. User provided "WPAYSTDWPAY00000" which is 16 chars string.
// The library expects Base64 encoded strings for Key and IV.
const IV_STRING = 'WPAYSTDWPAY00000';
const DEFAULT_IV = Buffer.from(IV_STRING, 'utf-8').toString('base64');

export function encryptSeed(text: string, key = DEFAULT_KEY, iv = DEFAULT_IV): string {
    // KISA_SEED_CBC.encrypt likely handles PKCS5/PKCS7 padding as it is a port of the KISA Java implementation.
    return KISA_SEED_CBC.encrypt(key, iv, text);
}

export function decryptSeed(encryptedText: string, key = DEFAULT_KEY, iv = DEFAULT_IV): string {
    const decryptedBase64 = KISA_SEED_CBC.decrypt(key, iv, encryptedText);
    // The library returns the decrypted value as a Base64 string, so we need to decode it.
    return Buffer.from(decryptedBase64, 'base64').toString('utf-8');
}
