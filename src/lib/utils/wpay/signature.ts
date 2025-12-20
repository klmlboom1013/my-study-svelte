export async function generateSignature(
    data: Record<string, string>,
    hashKey: string
): Promise<string> {
    // defined signing order based on prompt
    const signingOrder = [
        "mid",
        "userId",
        "ci",
        "reqType",
        "userNm",
        "hNum",
        "hCorp",
        "birthDay",
        "socialNo2",
        "frnrYn",
        "returnUrl",
        "payUrl"
    ];

    let source = "";
    for (const key of signingOrder) {
        if (data[key]) {
            source += data[key];
        }
    }

    // Append hashKey
    source += hashKey;

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
