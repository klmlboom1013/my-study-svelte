import type { ServerType, ServiceType, SiteType, ChannelType } from "$lib/utils/config/wpayServerConfig";
import { WPAY_USER_KEYS, SERVICE_URLS } from "$lib/server/secrets";
import { CHANNEL_KEYS } from "$lib/utils/encryption/cryptoConfig";

interface GetMemberTokenParams {
    loginId: string;
    phone: string;
    serverType: ServerType;
    service: ServiceType;
    loginSite: SiteType;
    channel: ChannelType;
}

interface MemberTokenResponse {
    token: string;
}

export async function getMemberToken(params: GetMemberTokenParams): Promise<MemberTokenResponse> {
    const { loginId, phone, serverType, service, loginSite, channel } = params;

    // TODO: Implement actual API call with SEED encryption and Hash Generation
    console.log("Requesting Member Token with params:", params);

    // Simulate Network Delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validating configuration availability (Mock)
    const encryptionConfig = CHANNEL_KEYS[channel];
    if (!encryptionConfig) {
        throw new Error(`Encryption configuration not found for channel: ${channel}`);
    }

    const wpayUserKey = WPAY_USER_KEYS[serverType];
    // console.log(`Using wpayUserKey: ${wpayUserKey}`);
    // console.log(`Using Encryption Keys:`, encryptionConfig);

    // Determining Target URL (Mock)
    let baseUrl = "";
    if (serverType === "PROD") {
        // Defaulting to GLB for mock simplicity, in real app need proper valid domain logic
        const prodData = SERVICE_URLS[service].PROD;
        // Assuming GLB for now since we don't pass the specific domain key easily here without more refactoring
        // For 'wpaystd-old' & 'wpaypro' it's nested differently in type definition but structure is consistent
        baseUrl = Object.values(prodData)[0];
    } else {
        baseUrl = SERVICE_URLS[service][serverType];
    }
    console.log(`Target URL would be: ${baseUrl}`);

    // Mock Token Generation
    const mockToken = `MOCK_TOKEN_${loginId}_${Date.now()}`;

    return {
        token: mockToken
    };
}
