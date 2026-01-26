export const WPAY_POPUP_CONFIG = {
    WIDTH: 400,
    HEIGHT: 800,
} as const;

export const WPAY_INTEGRATION = {
    MID: "INIwpayT03",
    URLS: {
        MEMBER_SEARCH: "https://wpay.inicis.com/stdwpay/apis/schMemRegInfo",
        SIGNUP: "https://wpaystd.inicis.com/stdwpay/std/u/v1/memreg",
        PIN_AUTH: "https://wpaystd.inicis.com/stdwpay/std/u/v1/pinno/auth",
    },
} as const;
