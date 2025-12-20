import { SERVER_TYPES, PROD_SERVER_DOMAINS, type ServiceType, type ProdServerDomain } from "$lib/types/wpayServerType";

export const WPAY_USER_KEYS = {
    [SERVER_TYPES.DEV]: "ST201812270000000662",
    [SERVER_TYPES.STG]: "ST201812270000000662",
    [SERVER_TYPES.PROD]: "DR201807250000067999",
} as const;

export { SERVICE_URLS } from "$lib/constants/wpayUrls";
