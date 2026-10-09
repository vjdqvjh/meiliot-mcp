export type MeiliotClientOptions = {
  baseUrl: string;
  token: string;
};

export class MeiliotApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Meiliot API ${status}: ${JSON.stringify(body)}`);
    this.name = "MeiliotApiError";
  }
}

export class MeiliotClient {
  private baseUrl: string;
  private token: string;

  constructor(opts: MeiliotClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.token = opts.token;
  }

  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | undefined | null>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1${path.startsWith("/") ? path : `/${path}`}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== "") url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
    };
    let payload: string | undefined;
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const res = await fetch(url, { method, headers, body: payload });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (!res.ok) {
      throw new MeiliotApiError(res.status, data);
    }
    return data as T;
  }

  get<T = unknown>(path: string, query?: Record<string, string | undefined | null>) {
    return this.request<T>("GET", path, undefined, query);
  }
  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }
  patch<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body);
  }
  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, body);
  }
  delete<T = unknown>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

export function createClientFromEnv(): MeiliotClient {
  const token = process.env.MEILIOT_API_TOKEN?.trim();
  if (!token) {
    throw new Error("MEILIOT_API_TOKEN is required");
  }
  const baseUrl =
    process.env.MEILIOT_BASE_URL?.trim() || "https://www.meiliot.com";
  return new MeiliotClient({ baseUrl, token });
}
