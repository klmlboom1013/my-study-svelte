export const APPLICATION_OPTIONS = [
    "WPAY",
    "Express",
    "Smart",
    "sbuckwpay",
] as const;

export type ApplicationType = typeof APPLICATION_OPTIONS[number];
