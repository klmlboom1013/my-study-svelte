import type { ServerType, ServiceType } from "./wpayServerType";

export interface AuthToken {
    server: ServerType;
    site: string;
    service: string;
    wpayUserKey: string;
    wtid: string;
    userId: string;
    createdAt: string; // yyyy-mm-dd hh24:mi:ss
    updatedAt: string; // yyyy-mm-dd hh24:mi:ss
    expiresAt: string; // yyyy-mm-dd hh24:mi:ss
    uu: string; // 6자리 10진수 랜덤
    sgn: string; // 서명
}
