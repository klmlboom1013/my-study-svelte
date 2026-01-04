export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type RequestType = "REST" | "FORM";

export interface RequestDataField {
    name: string;
    type: "string" | "number" | "boolean";
    length?: number;
    required: boolean;
    encrypt: boolean;
    encoded: boolean;
    signingOrder?: number;
    description?: string;
}

export interface ResponseDataField {
    name: string;
    type: "string" | "number" | "boolean";
    length?: number;
    encrypt: boolean;
    decoded: boolean;
    signingOrder?: number;
    description?: string;
}

export interface Endpoint {
    id: string;
    name: string;
    description?: string;
    application: string; // "WPAY" | "Express" | "Smart"
    method: HttpMethod;
    uri: string;
    requestType: RequestType;
    scope: {
        service: string;
        site: string;
    };
    config: {
        contentType?: string;
        charset?: string;
        customHeaders?: { key: string; value: string }[];
    };
    requestData: RequestDataField[];
    responseData: ResponseDataField[];
    createdAt: number;
    updatedAt: number;
}
