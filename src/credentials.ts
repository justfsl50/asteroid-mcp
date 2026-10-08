/**
 * Credential Management for asteroid-mcp.
 *
 * Persists student session API keys locally to ~/.asteroid/credentials.json
 * so students authenticate once and Claude Desktop / Cursor remembers them.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface StoredCredentials {
  apiKey?: string;
  userId?: string;
  institute?: string;
  baseUrl?: string;
  lastLogin?: string;
}

const CONFIG_DIR = join(homedir(), ".asteroid");
const CONFIG_FILE = join(CONFIG_DIR, "credentials.json");

export class CredentialManager {
  #creds: StoredCredentials = {};

  constructor() {
    this.load();
  }

  load(): StoredCredentials {
    try {
      if (existsSync(CONFIG_FILE)) {
        const text = readFileSync(CONFIG_FILE, "utf8");
        this.#creds = JSON.parse(text);
      }
    } catch {
      this.#creds = {};
    }
    return this.#creds;
  }

  save(creds: Partial<StoredCredentials>): void {
    try {
      if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
      }
      this.#creds = { ...this.#creds, ...creds, lastLogin: new Date().toISOString() };
      writeFileSync(CONFIG_FILE, JSON.stringify(this.#creds, null, 2), "utf8");
    } catch (err) {
      console.error("[asteroid-mcp] Warning: Failed to persist credentials to disk:", err);
    }
  }

  getApiKey(): string {
    return process.env.ASTEROID_KEY || this.#creds.apiKey || "";
  }

  getBaseUrl(): string {
    return (process.env.ASTEROID_URL || this.#creds.baseUrl || "https://erp.handlebid.lol").replace(/\/+$/, "");
  }

  getUserId(): string {
    return this.#creds.userId || "";
  }

  getInstitute(): string {
    return this.#creds.institute || "AXIS719";
  }

  isAuthenticated(): boolean {
    return Boolean(this.getApiKey());
  }

  clear(): void {
    this.#creds = {};
    try {
      if (existsSync(CONFIG_FILE)) {
        writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2), "utf8");
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

export const credentials = new CredentialManager();
