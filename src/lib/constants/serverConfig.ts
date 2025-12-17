export const SERVER_TYPES = {
    DEV: "DEV",
    STG: "STG",
    PROD: "PROD",
} as const;

export type ServerType = typeof SERVER_TYPES[keyof typeof SERVER_TYPES];

export const PROD_SERVER_DOMAINS = {
    GLB: "GLB Domain",
    KS: "KS Domain",
    FC: "FC Domain",
} as const;

export type ProdServerDomain = typeof PROD_SERVER_DOMAINS[keyof typeof PROD_SERVER_DOMAINS];

export const SERVICE_OPTIONS = [
    "wpaystd-old",
    "wpaystd2",
    "wpaypro",
    "wpayplus",
    "wpaycst",
] as const;

export type ServiceType = typeof SERVICE_OPTIONS[number];

export const SITE_OPTIONS = [
    "stdwpay",
] as const;

export type SiteType = typeof SITE_OPTIONS[number];

export const CHANNEL_OPTIONS = [
    "INIwpayT03"
] as const;

export type ChannelType = typeof CHANNEL_OPTIONS[number];

export const SERVICE_SITE_MAPPING: Record<ServiceType, SiteType[]> = {
    "wpaystd-old": ["stdwpay"],
    "wpaystd2": ["stdwpay"],
    "wpaypro": [],
    "wpayplus": [],
    "wpaycst": [],
};

export const SITE_CHANNEL_MAPPING: Record<SiteType, ChannelType[]> = {
    "stdwpay": ["INIwpayT03"],
};


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
