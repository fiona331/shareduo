import { randomBytes, timingSafeEqual } from "crypto";
import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidGrantError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { store } from "./store.js";

// ---------------------------------------------------------------------------
// Lifetimes
// ---------------------------------------------------------------------------

const AUTH_CODE_TTL_SEC    = 10 * 60;                // 10 minutes
const ACCESS_TOKEN_TTL_SEC = 60 * 60;                // 1 hour
const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;     // 30 days

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Public helpers — called by /auth-verify in index.ts after password check
// ---------------------------------------------------------------------------

export async function issueAuthCode(
  codeChallenge: string,
  redirectUri: string,
  state?: string
): Promise<string> {
  const code = generateToken(32);
  await store.setAuthCode(
    code,
    {
      codeChallenge,
      redirectUri,
      state,
      expiresAt: Date.now() + AUTH_CODE_TTL_SEC * 1000,
    },
    AUTH_CODE_TTL_SEC
  );
  return code;
}

export function checkMcpToken(provided: string): boolean {
  const expected = process.env.SHAREDUO_MCP_TOKEN ?? "";
  if (!expected || !provided) return false;
  const a = Buffer.alloc(Math.max(provided.length, expected.length));
  const b = Buffer.alloc(Math.max(provided.length, expected.length));
  Buffer.from(provided).copy(a);
  Buffer.from(expected).copy(b);
  return timingSafeEqual(a, b) && provided.length === expected.length;
}

// ---------------------------------------------------------------------------
// Registered client — public client (no secret), secured by password page
// ---------------------------------------------------------------------------

// Pre-registered static client (for Claude Code CLI / manual config)
function getStaticClient(): OAuthClientInformationFull {
  return {
    client_id: "shareduo",
    client_id_issued_at: 0,
    redirect_uris: [
      "https://claude.ai/api/mcp/auth_callback",
      "http://localhost",
      "http://127.0.0.1",
    ],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
}

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId) {
    if (clientId === "shareduo") return getStaticClient();
    return await store.getClient(clientId);
  },

  // Dynamic Client Registration (RFC 7591). Security lives in the password
  // page at /authorize — any client may register, but only token-holders
  // get authorization codes. We force public-client semantics so no secret
  // is required at /token (claude.ai doesn't send one).
  async registerClient(client) {
    // Strip the SDK-generated client_secret before storing. We're a public
    // client — security is enforced at /authorize via the password page, not
    // via a client secret. If we leave client_secret on the stored record,
    // the SDK's authenticateClient middleware will REQUIRE it at /token
    // and reject requests from clients that honored our advertised
    // token_endpoint_auth_method: "none".
    const { client_secret: _cs, client_secret_expires_at: _cse, ...rest } = client as OAuthClientInformationFull & {
      client_secret?: string;
      client_secret_expires_at?: number;
    };
    const client_id = generateToken(16);
    const registered: OAuthClientInformationFull = {
      ...rest,
      client_id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      token_endpoint_auth_method: "none",
    };
    await store.setClient(client_id, registered);
    return registered;
  },
};

// ---------------------------------------------------------------------------
// Password page HTML
// ---------------------------------------------------------------------------

export function passwordPageHtml(params: {
  codeChallenge: string;
  redirectUri: string;
  state: string;
  error?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to ShareDuo</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="Connect to ShareDuo">
  <meta property="og:description" content="Authorize Claude to push HTML artifacts to ShareDuo.">
  <meta property="og:image" content="https://mcp.shareduo.com/favicon.svg">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#fff 0%,#f9fafb 50%,#eff6ff 100%);
         display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:1rem;padding:2.5rem;
          max-width:360px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .logo{font-size:.75rem;font-weight:600;color:#9ca3af;letter-spacing:.05em;text-transform:uppercase;margin-bottom:1.5rem}
    h1{font-size:1.125rem;font-weight:600;color:#111827;margin-bottom:.375rem}
    .sub{color:#6b7280;font-size:.875rem;margin-bottom:1.5rem;line-height:1.5}
    input{width:100%;padding:.625rem .875rem;background:#f9fafb;border:1px solid #e5e7eb;
          border-radius:.75rem;color:#111827;font-size:.9375rem;margin-bottom:.75rem;outline:none}
    input:focus{border-color:#d1d5db;background:#fff}
    button{width:100%;padding:.625rem;background:#111827;color:#fff;border:none;
           border-radius:.75rem;font-size:.9375rem;cursor:pointer;font-weight:500}
    button:hover{background:#374151}
    .error{color:#ef4444;font-size:.8125rem;margin-bottom:.75rem}
  </style>
</head>
<body>
  <div class="card">
    <p class="logo">ShareDuo</p>
    <h1>Connect to ShareDuo</h1>
    <p class="sub">Enter your access token to connect Claude.</p>
    ${params.error ? `<p class="error">${escapeHtml(params.error)}</p>` : ""}
    <form method="POST" action="/auth-verify">
      <input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}">
      <input type="hidden" name="redirect_uri"   value="${escapeHtml(params.redirectUri)}">
      <input type="hidden" name="state"          value="${escapeHtml(params.state)}">
      <input type="password" name="token" placeholder="Enter access token" autofocus required>
      <button type="submit">Connect</button>
    </form>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// OAuth provider
// ---------------------------------------------------------------------------

export function createOAuthProvider(): OAuthServerProvider {
  return {
    get clientsStore(): OAuthRegisteredClientsStore {
      return clientsStore;
    },

    // Show password page — actual code issuance happens in POST /auth-verify
    async authorize(
      _client: OAuthClientInformationFull,
      params: AuthorizationParams,
      res: Response
    ): Promise<void> {
      res.setHeader("Content-Type", "text/html");
      res.send(
        passwordPageHtml({
          codeChallenge: params.codeChallenge,
          redirectUri:   params.redirectUri,
          state:         params.state ?? "",
        })
      );
    },

    async challengeForAuthorizationCode(
      _client: OAuthClientInformationFull,
      authorizationCode: string
    ): Promise<string> {
      const record = await store.getAuthCode(authorizationCode);
      if (!record) {
        throw new InvalidGrantError("Invalid or expired authorization code");
      }
      return record.codeChallenge;
    },

    async exchangeAuthorizationCode(
      client: OAuthClientInformationFull,
      authorizationCode: string
    ): Promise<OAuthTokens> {
      const record = await store.getAuthCode(authorizationCode);
      if (!record) {
        throw new InvalidGrantError("Invalid or expired authorization code");
      }
      await store.deleteAuthCode(authorizationCode);

      const accessToken  = generateToken(32);
      const refreshToken = generateToken(32);

      await store.setAccessToken(
        accessToken,
        { clientId: client.client_id, expiresAt: Date.now() + ACCESS_TOKEN_TTL_SEC * 1000 },
        ACCESS_TOKEN_TTL_SEC
      );
      await store.setRefreshToken(
        refreshToken,
        { clientId: client.client_id, expiresAt: Date.now() + REFRESH_TOKEN_TTL_SEC * 1000 },
        REFRESH_TOKEN_TTL_SEC
      );

      return {
        access_token:  accessToken,
        token_type:    "bearer",
        expires_in:    ACCESS_TOKEN_TTL_SEC,
        refresh_token: refreshToken,
      };
    },

    async exchangeRefreshToken(
      client: OAuthClientInformationFull,
      refreshToken: string
    ): Promise<OAuthTokens> {
      const record = await store.getRefreshToken(refreshToken);
      if (!record || record.clientId !== client.client_id) {
        throw new InvalidGrantError("Invalid or expired refresh token");
      }
      await store.deleteRefreshToken(refreshToken);

      const accessToken     = generateToken(32);
      const newRefreshToken = generateToken(32);

      await store.setAccessToken(
        accessToken,
        { clientId: client.client_id, expiresAt: Date.now() + ACCESS_TOKEN_TTL_SEC * 1000 },
        ACCESS_TOKEN_TTL_SEC
      );
      await store.setRefreshToken(
        newRefreshToken,
        { clientId: client.client_id, expiresAt: Date.now() + REFRESH_TOKEN_TTL_SEC * 1000 },
        REFRESH_TOKEN_TTL_SEC
      );

      return {
        access_token:  accessToken,
        token_type:    "bearer",
        expires_in:    ACCESS_TOKEN_TTL_SEC,
        refresh_token: newRefreshToken,
      };
    },

    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const record = await store.getAccessToken(token);
      if (!record) {
        throw new InvalidTokenError("Invalid or expired access token");
      }
      return {
        token,
        clientId:  record.clientId,
        scopes:    [],
        expiresAt: Math.floor(record.expiresAt / 1000),
      };
    },

    async revokeToken(
      _client: OAuthClientInformationFull,
      request: OAuthTokenRevocationRequest
    ): Promise<void> {
      // The spec allows revoking either an access or refresh token without
      // knowing which one it is — try both.
      await store.deleteAccessToken(request.token);
      await store.deleteRefreshToken(request.token);
    },
  };
}
