// Server Type
export const SERVER_TYPES = {
    DEV: "DEV",
    STG: "STG",
    PROD: "PROD",
} as const;

export type ServerType = typeof SERVER_TYPES[keyof typeof SERVER_TYPES];

// Prod Server Domain
export const PROD_SERVER_DOMAINS = {
    GLB: "GLB Domain",
    KS: "KS Domain",
    FC: "FC Domain",
} as const;

export type ProdServerDomain = typeof PROD_SERVER_DOMAINS[keyof typeof PROD_SERVER_DOMAINS];

// Service
export const SERVICE_OPTIONS = [
    "wpaystd",
    "wpaystd2",
    "wpaypro",
    "wpayplus",
    "wpaycst",
] as const;

export type ServiceType = typeof SERVICE_OPTIONS[number];

// Site
export const SITE_OPTIONS = [
    "stdwpay",
    "kbstar",
    "gspay",
    "ygypay"
] as const;

export type SiteType = typeof SITE_OPTIONS[number];

// Merchant ID
export const MERCHANT_ID_OPTIONS = [
    "INIwpayT03",
    "GSpayTS003",
    "yogiyopay1"
] as const;

export type MerchantIdType = typeof MERCHANT_ID_OPTIONS[number];

// Service Site Mapping
export const SERVICE_SITE_MAPPING: Record<ServiceType, SiteType[]> = {
    "wpaystd": ["stdwpay"],
    "wpaystd2": ["stdwpay"],
    "wpaypro": ["ygypay"],
    "wpayplus": ["stdwpay", "kbstar", "gspay"],
    "wpaycst": ["kbstar", "gspay"],
};

// Site Merchant ID Mapping
export const SITE_MERCHANT_ID_MAPPING: Record<SiteType, MerchantIdType[]> = {
    "stdwpay": ["INIwpayT03"],
    "gspay": ["GSpayTS003"],
    "ygypay": ["yogiyopay1"],
    "kbstar": []
};
