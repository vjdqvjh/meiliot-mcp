export class MeiliotApiError extends Error {
    status;
    body;
    constructor(status, body) {
        super(`Meiliot API ${status}: ${JSON.stringify(body)}`);
        this.status = status;
        this.body = body;
        this.name = "MeiliotApiError";
    }
}
export class MeiliotClient {
    baseUrl;
    token;
    constructor(opts) {
        this.baseUrl = opts.baseUrl.replace(/\/$/, "");
        this.token = opts.token;
    }
    async request(method, path, body, query) {
        const url = new URL(`${this.baseUrl}/api/v1${path.startsWith("/") ? path : `/${path}`}`);
        if (query) {
            for (const [k, v] of Object.entries(query)) {
                if (v != null && v !== "")
                    url.searchParams.set(k, v);
            }
        }
        const headers = {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/json",
        };
        let payload;
        if (body !== undefined) {
            headers["Content-Type"] = "application/json";
            payload = JSON.stringify(body);
        }
        const res = await fetch(url, { method, headers, body: payload });
        const text = await res.text();
        let data = null;
        if (text) {
            try {
                data = JSON.parse(text);
            }
            catch {
                data = { raw: text };
            }
        }
        if (!res.ok) {
            throw new MeiliotApiError(res.status, data);
        }
        return data;
    }
    get(path, query) {
        return this.request("GET", path, undefined, query);
    }
    post(path, body) {
        return this.request("POST", path, body);
    }
    patch(path, body) {
        return this.request("PATCH", path, body);
    }
    put(path, body) {
        return this.request("PUT", path, body);
    }
    delete(path) {
        return this.request("DELETE", path);
    }
}
export function createClientFromEnv() {
    const token = process.env.MEILIOT_API_TOKEN?.trim();
    if (!token) {
        throw new Error("MEILIOT_API_TOKEN is required");
    }
    const baseUrl = process.env.MEILIOT_BASE_URL?.trim() || "https://www.meiliot.com";
    return new MeiliotClient({ baseUrl, token });
}
