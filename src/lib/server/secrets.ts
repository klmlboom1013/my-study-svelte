import { SERVER_TYPES, PROD_SERVER_DOMAINS, type ServiceType, type ProdServerDomain } from "$lib/features/auth/wpayServerSiteOptions";

export const WPAY_USER_KEYS = {
    [SERVER_TYPES.DEV]: "ST201812270000000662",
    [SERVER_TYPES.STG]: "ST201812270000000662",
    [SERVER_TYPES.PROD]: "DR201807250000067999",
} as const;

const COMMON_URLS_1 = { // wpaystd-old & wpaypro
    DEV: "https://devwpay.inicis.com",
    STG: "https://stgwpay.inicis.com",
    PROD: {
        [PROD_SERVER_DOMAINS.GLB]: "https://wpay.inicis.com",
        [PROD_SERVER_DOMAINS.KS]: "https://kswpay.inicis.com",
        [PROD_SERVER_DOMAINS.FC]: "https://fcwpay.inicis.com",
    }
};

export const SERVICE_URLS: Record<ServiceType, {
    DEV: string;
    STG: string;
    PROD: Record<ProdServerDomain, string>;
}> = {
    "wpaystd-old": COMMON_URLS_1,
    "wpaypro": COMMON_URLS_1,
    "wpaystd2": {
        DEV: "https://devwpaystd.inicis.com",
        STG: "https://stgwpaystd.inicis.com",
        PROD: {
            [PROD_SERVER_DOMAINS.GLB]: "https://wpaystd.inicis.com",
            [PROD_SERVER_DOMAINS.KS]: "https://kswpaystd.inicis.com",
            [PROD_SERVER_DOMAINS.FC]: "https://fcwpaystd.inicis.com",
        }
    },
    "wpayplus": {
        DEV: "https://devwpayplus.inicis.com",
        STG: "https://stgwpayplus.inicis.com",
        PROD: {
            [PROD_SERVER_DOMAINS.GLB]: "https://wpayplus.inicis.com",
            [PROD_SERVER_DOMAINS.KS]: "https://kswpayplusplus.inicis.com",
            [PROD_SERVER_DOMAINS.FC]: "https://fcwpayplus.inicis.com",
        }
    },
    "wpaycst": {
        DEV: "https://devwpaycst.inicis.com",
        STG: "https://stgwpaycst.inicis.com",
        PROD: {
            [PROD_SERVER_DOMAINS.GLB]: "https://wpaycst.inicis.com",
            [PROD_SERVER_DOMAINS.KS]: "https://kswpaycst.inicis.com",
            [PROD_SERVER_DOMAINS.FC]: "https://fcwpaycst.inicis.com",
        }
    }
};
