import type { ServerType } from "./wpayServerType";
import type { JWTPayload } from "jose";

export interface AuthToken extends JWTPayload {
    server: ServerType;
    site: string;
    service: string;
    wpayUserKey: string;
    wtid: string;
    // Standard JWT claims (optional in JwtPayload but we want to be explicit)
    iss?: string;
    sub?: string; // userId
    iat?: number;
    exp?: number;
    uu: string; // 6-digit random
    mid: string; // Added mid for independent validation
}
