/**
 * HTTP Client connecting to the Asteroid ERP backend.
 *
 * Supports authentication injection, session resumption, and error recovery.
 */
import { credentials } from "./credentials.js";

export class AsteroidClient {
  readonly #baseUrl: string;

  constructor(baseUrl?: string) {
    this.#baseUrl = baseUrl || credentials.getBaseUrl();
  }

  get baseUrl(): string {
    return this.#baseUrl;
  }

  async get<T = any>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    const key = credentials.getApiKey();
    if (!key && endpoint !== "/v1/institutes" && endpoint !== "/health") {
      throw new Error(
        "Not authenticated with Axis ERP. Please run the 'sign_in' tool with your student username and password first."
      );
    }

    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        query.set(k, String(v));
      }
    }
    const qs = query.toString();
    const url = `${this.#baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}${qs ? `?${qs}` : ""}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (key) {
      headers["Authorization"] = `Bearer ${key}`;
    }

    const res = await fetch(url, { method: "GET", headers });
    const text = await res.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg = typeof data === "object" ? data.message || data.error || JSON.stringify(data) : text;
      throw new Error(`Asteroid API Error [${res.status}]: ${msg}`);
    }

    return data as T;
  }

  async post<T = any>(endpoint: string, body: Record<string, unknown> = {}): Promise<T> {
    const key = credentials.getApiKey();
    const url = `${this.#baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (key) {
      headers["Authorization"] = `Bearer ${key}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg = typeof data === "object" ? data.message || data.error || JSON.stringify(data) : text;
      throw new Error(`Asteroid API Error [${res.status}]: ${msg}`);
    }

    return data as T;
  }

  /** Sign in with student credentials, mint an API key, and persist it locally. */
  async signIn(userId: string, password: string, institute = "AXIS719"): Promise<{
    apiKey: string;
    userId: string;
    institute: string;
  }> {
    const res = await this.post<{
      apiKey: string;
      user: { id: string; institute: string };
    }>("/v1/auth/login", {
      userId,
      password,
      institute,
    });

    const apiKey = res.apiKey;
    credentials.save({
      apiKey,
      userId,
      institute: res.user?.institute || institute,
      baseUrl: this.#baseUrl,
    });

    return {
      apiKey,
      userId,
      institute: res.user?.institute || institute,
    };
  }
}

export const client = new AsteroidClient();
