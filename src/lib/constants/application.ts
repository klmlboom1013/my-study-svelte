// Application Options
export const APPLICATION_OPTIONS = [
    "WPAY",
    // "Express", // Future support
    // "Smart",   // Future support
] as const;

export type ApplicationType = typeof APPLICATION_OPTIONS[number];
