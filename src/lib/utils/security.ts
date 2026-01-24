import { encryptSeed, decryptSeed } from './encryption/cryptoSeed';
import type { RequestDataField, ResponseDataField } from '$lib/types/endpoint';

export interface SecurityContext {
    hashKey?: string;
    encKey?: string;
    encIV?: string;
}

export async function generateSignature(
    values: Record<string, any>,
    fields: { name: string; signingOrder?: number }[],
    method: string,
    context: SecurityContext
): Promise<{ signature: string; rawString: string }> {
    if (!method) return { signature: '', rawString: '' };

    // 1. Identify signing fields and sort them
    const signingFields = fields
        .filter(f => f.signingOrder !== undefined && f.signingOrder > 0)
        .sort((a, b) => (a.signingOrder || 0) - (b.signingOrder || 0));

    if (signingFields.length === 0) return { signature: '', rawString: '' };

    // 2. Construct raw string logic based on method template
    // Expected templates: 
    // "toHexString( SHA256( key=value&...&key=value&hashKey={hash key} ) )"
    // "toHexString( SHA256( value&...&value&{hash key} ) )"

    // Expected values from Editor: "HMAC_SHA256_KV" or "HMAC_SHA256_V"
    // Also handling legacy/raw string templates for robustness

    // Determine Key-Value mode
    // HMAC_SHA256_KV: key=value
    // HMAC_SHA256_V:  value only
    // Fallback: Check for "key=value" in string
    const isKeyValue = method === 'HMAC_SHA256_KV' || method.includes('key=value') || method.includes('key = value');

    console.log('[generateSignature] Method:', method, 'isKeyValue:', isKeyValue);

    let rawString = '';
    const parts = signingFields.map(field => {
        const val = values[field.name] || '';
        return isKeyValue ? `${field.name}=${val}` : val;
    });

    rawString = parts.join('&');

    // Append hash key
    if (context.hashKey) {
        // Explicit code check
        if (method === 'HMAC_SHA256_KV') {
            // "...&hashKey={hash key}" -> &hashKey=KEY
            rawString += `&hashKey=${context.hashKey}`;
        } else if (method === 'HMAC_SHA256_V') {
            // "...&{hash key}" -> &KEY
            rawString += `&${context.hashKey}`;
        } else {
            // Legacy/Text parsing fallback
            if (method.includes('hashKey={hash key}') || method.includes('hash={hash key}')) {
                if (isKeyValue) {
                    rawString += `&hashKey=${context.hashKey}`;
                } else {
                    rawString += `&${context.hashKey}`;
                }
            } else if (method.includes('{hash key}')) {
                rawString += `&${context.hashKey}`;
            }
        }
    }

    // 3. Hash (SHA-256)
    const encoder = new TextEncoder();
    const data = encoder.encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // 4. Convert to Hex String
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return { signature, rawString };
}

export function encryptData(
    values: Record<string, any>,
    fields: RequestDataField[],
    context: SecurityContext
): Record<string, any> {
    const processed = { ...values };

    if (context.encKey && context.encIV) {
        for (const field of fields) {
            if (field.encrypt) {
                let val = processed[field.name];
                // Skip encryption for empty values, but allow 0
                const shouldEncrypt = val !== "" && val !== null && val !== undefined;
                processed[field.name] = shouldEncrypt ? encryptSeed(String(val), context.encKey, context.encIV) : "";
            }
        }
    }

    return processed;
}

export function urlEncodeData(
    values: Record<string, any>,
    fields: RequestDataField[]
): Record<string, any> {
    const processed = { ...values };

    for (const field of fields) {
        if (field.encoded) {
            let val = processed[field.name];
            processed[field.name] = encodeURIComponent(String(val));
        }
    }

    return processed;
}

export function decryptData(
    values: Record<string, any>,
    fields: ResponseDataField[],
    context: SecurityContext
): Record<string, any> {
    const processed = { ...values };

    if (context.encKey && context.encIV) {
        for (const field of fields) {
            if (field.encrypt) {
                let val = processed[field.name];
                const shouldDecrypt = val !== "" && val !== null && val !== undefined;
                if (shouldDecrypt) {
                    try {
                        processed[field.name] = decryptSeed(String(val), context.encKey, context.encIV);
                    } catch (e) {
                        console.error(`Decryption failed for ${field.name}`, e);
                    }
                }
            }
        }
    }

    return processed;
}

export function urlDecodeData(
    values: Record<string, any>,
    fields: ResponseDataField[]
): Record<string, any> {
    const processed = { ...values };

    for (const field of fields) {
        if (field.decoded) {
            let val = processed[field.name];
            if (val) {
                try {
                    processed[field.name] = decodeURIComponent(String(val));
                } catch (e) {
                    console.error(`Decoding failed for ${field.name}`, e);
                }
            }
        }
    }

    return processed;
}
