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
