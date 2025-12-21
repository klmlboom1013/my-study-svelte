export async function generateSignature(
    data: Record<string, string>,
    hashKey: string,
    signingOrder: string[] = [
        "mid",
        "userId",
        "ci",
        "userNm",
        "hNum",
        "hCorp",
        "birthDay",
        "socialNo2",
        "frnrYn",
        "returnUrl"
    ]
): Promise<string> {
    const parts: string[] = [];
    for (const key of signingOrder) {
        const value = data[key] || "";
        parts.push(`${key}=${value}`);
    }

    // Append hashKey
    parts.push(`hashKey=${hashKey}`);

    const source = parts.join("&");

    console.log("WPAY Signature Source String:", source);

    // Generate SHA-256 hash
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(source);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);

    // Convert to Hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    return hashHex;
}
