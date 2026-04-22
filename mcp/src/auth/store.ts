import { Redis } from "@upstash/redis";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { env } from "../lib/env.js";

// ---------------------------------------------------------------------------
// Record shapes (stored as JSON)
// ---------------------------------------------------------------------------

export interface AuthCodeRecord {
  codeChallenge: string;
  redirectUri: string;
  state?: string;
  expiresAt: number;
}

export interface TokenRecord {
  clientId: string;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Store interface — same shape for both Redis and in-memory backends
// ---------------------------------------------------------------------------

export interface OAuthStore {
  // Auth codes (short-lived, 10 min)
  setAuthCode(code: string, record: AuthCodeRecord, ttlSeconds: number): Promise<void>;
  getAuthCode(code: string): Promise<AuthCodeRecord | undefined>;
  deleteAuthCode(code: string): Promise<void>;

  // Access tokens (1 hour)
  setAccessToken(token: string, record: TokenRecord, ttlSeconds: number): Promise<void>;
  getAccessToken(token: string): Promise<TokenRecord | undefined>;
  deleteAccessToken(token: string): Promise<void>;

  // Refresh tokens (30 days)
  setRefreshToken(token: string, record: TokenRecord, ttlSeconds: number): Promise<void>;
  getRefreshToken(token: string): Promise<TokenRecord | undefined>;
  deleteRefreshToken(token: string): Promise<void>;

  // Dynamic clients (persist indefinitely — tiny records)
  setClient(clientId: string, info: OAuthClientInformationFull): Promise<void>;
  getClient(clientId: string): Promise<OAuthClientInformationFull | undefined>;
}

// ---------------------------------------------------------------------------
// Redis backend — used in production
// ---------------------------------------------------------------------------

function createRedisStore(redis: Redis): OAuthStore {
  const K = {
    authCode:     (c: string) => `mcp:authcode:${c}`,
    accessToken:  (t: string) => `mcp:access:${t}`,
    refreshToken: (t: string) => `mcp:refresh:${t}`,
    client:       (id: string) => `mcp:client:${id}`,
  };

  return {
    async setAuthCode(code, record, ttl) {
      await redis.set(K.authCode(code), record, { ex: ttl });
    },
    async getAuthCode(code) {
      return (await redis.get<AuthCodeRecord>(K.authCode(code))) ?? undefined;
    },
    async deleteAuthCode(code) {
      await redis.del(K.authCode(code));
    },

    async setAccessToken(token, record, ttl) {
      await redis.set(K.accessToken(token), record, { ex: ttl });
    },
    async getAccessToken(token) {
      return (await redis.get<TokenRecord>(K.accessToken(token))) ?? undefined;
    },
    async deleteAccessToken(token) {
      await redis.del(K.accessToken(token));
    },

    async setRefreshToken(token, record, ttl) {
      await redis.set(K.refreshToken(token), record, { ex: ttl });
    },
    async getRefreshToken(token) {
      return (await redis.get<TokenRecord>(K.refreshToken(token))) ?? undefined;
    },
    async deleteRefreshToken(token) {
      await redis.del(K.refreshToken(token));
    },

    async setClient(clientId, info) {
      await redis.set(K.client(clientId), info);
    },
    async getClient(clientId) {
      return (await redis.get<OAuthClientInformationFull>(K.client(clientId))) ?? undefined;
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory backend — used when Redis isn't configured (local dev)
// ---------------------------------------------------------------------------

function createMemoryStore(): OAuthStore {
  const authCodes     = new Map<string, AuthCodeRecord>();
  const accessTokens  = new Map<string, TokenRecord>();
  const refreshTokens = new Map<string, TokenRecord>();
  const clients       = new Map<string, OAuthClientInformationFull>();

  // Helper: get with expiry check — Redis auto-expires, but in-memory
  // has no such luxury, so we double-check on read.
  function liveOrUndefined<T extends { expiresAt: number }>(
    map: Map<string, T>,
    key: string
  ): T | undefined {
    const record = map.get(key);
    if (!record) return undefined;
    if (Date.now() > record.expiresAt) {
      map.delete(key);
      return undefined;
    }
    return record;
  }

  return {
    async setAuthCode(code, record, _ttl) {
      authCodes.set(code, record);
    },
    async getAuthCode(code) {
      return liveOrUndefined(authCodes, code);
    },
    async deleteAuthCode(code) {
      authCodes.delete(code);
    },

    async setAccessToken(token, record, _ttl) {
      accessTokens.set(token, record);
    },
    async getAccessToken(token) {
      return liveOrUndefined(accessTokens, token);
    },
    async deleteAccessToken(token) {
      accessTokens.delete(token);
    },

    async setRefreshToken(token, record, _ttl) {
      refreshTokens.set(token, record);
    },
    async getRefreshToken(token) {
      return liveOrUndefined(refreshTokens, token);
    },
    async deleteRefreshToken(token) {
      refreshTokens.delete(token);
    },

    async setClient(clientId, info) {
      clients.set(clientId, info);
    },
    async getClient(clientId) {
      return clients.get(clientId);
    },
  };
}

// ---------------------------------------------------------------------------
// Pick a backend at startup
// ---------------------------------------------------------------------------

export const store: OAuthStore = (() => {
  if (env.upstashRedisUrl && env.upstashRedisToken) {
    const redis = new Redis({
      url:   env.upstashRedisUrl,
      token: env.upstashRedisToken,
    });
    console.log("[store] using Upstash Redis for OAuth state");
    return createRedisStore(redis);
  }
  console.warn(
    "[store] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to in-memory. " +
      "OAuth state will be lost on restart. Set these env vars in production."
  );
  return createMemoryStore();
})();
