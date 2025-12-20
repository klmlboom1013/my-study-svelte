import { Buffer } from 'buffer';

if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
    (window as any).Buffer = Buffer;
}

import { KISA_SEED_CBC } from '@kr-yeon/kisa-seed';

// 128-bit key (16 bytes) - Test Key
// In production, load this from environment variables (e.g., $env/static/private)
export function encryptSeed(text: string, key: string, iv: string): string {
    // KISA_SEED_CBC.encrypt likely handles PKCS5/PKCS7 padding as it is a port of the KISA Java implementation.
    return KISA_SEED_CBC.encrypt(key, iv, text);
}

export function decryptSeed(encryptedText: string, key: string, iv: string): string {
    const decryptedBase64 = KISA_SEED_CBC.decrypt(key, iv, encryptedText);
    // The library returns the decrypted value as a Base64 string, so we need to decode it.
    return Buffer.from(decryptedBase64, 'base64').toString('utf-8');
}
