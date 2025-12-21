import { Buffer } from 'buffer';

if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
    (window as any).Buffer = Buffer;
}

import { KISA_SEED_CBC } from '@kr-yeon/kisa-seed';

// 128-bit key (16 bytes) - Test Key
// In production, load this from environment variables (e.g., $env/static/private)
export function encryptSeed(text: string, key: string, iv: string): string {
    const keyBytes = Array.from(Buffer.from(key, 'base64'));
    const ivBytes = Array.from(Buffer.from(iv, 'utf-8'));
    // KISA_SEED_CBC.encrypt handles PKCS5/PKCS7 padding
    // @ts-ignore
    return KISA_SEED_CBC.encrypt(keyBytes, ivBytes, text);
}

export function decryptSeed(encryptedText: string, key: string, iv: string): string {
    const keyBytes = Array.from(Buffer.from(key, 'base64'));
    const ivBytes = Array.from(Buffer.from(iv, 'utf-8'));
    // @ts-ignore
    const decryptedBase64 = KISA_SEED_CBC.decrypt(keyBytes, ivBytes, encryptedText);
    // The library returns the decrypted value as a Base64 string, so we need to decode it.
    return Buffer.from(decryptedBase64, 'base64').toString('utf-8');
}
