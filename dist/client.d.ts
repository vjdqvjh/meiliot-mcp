export type MeiliotClientOptions = {
    baseUrl: string;
    token: string;
};
export declare class MeiliotApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: unknown);
}
export declare class MeiliotClient {
    private baseUrl;
    private token;
    constructor(opts: MeiliotClientOptions);
    request<T = unknown>(method: string, path: string, body?: unknown, query?: Record<string, string | undefined | null>): Promise<T>;
    get<T = unknown>(path: string, query?: Record<string, string | undefined | null>): Promise<T>;
    post<T = unknown>(path: string, body?: unknown): Promise<T>;
    patch<T = unknown>(path: string, body?: unknown): Promise<T>;
    put<T = unknown>(path: string, body?: unknown): Promise<T>;
    delete<T = unknown>(path: string): Promise<T>;
}
export declare function createClientFromEnv(): MeiliotClient;
