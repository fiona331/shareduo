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
// In-memory stores
// ---------------------------------------------------------------------------

interface AuthCodeRecord {
  codeChallenge: string;
  redirectUri: string;
  state?: string;
  expiresAt: number;
}

interface TokenRecord {
  clientId: string;
  expiresAt: number;
}

const authCodes    = new Map<string, AuthCodeRecord>();
const accessTokens  = new Map<string, TokenRecord>();
const refreshTokens = new Map<string, TokenRecord>();

// ---------------------------------------------------------------------------
// Public helper — called by POST /authorize in index.ts after password check
// ---------------------------------------------------------------------------

export function issueAuthCode(
  codeChallenge: string,
  redirectUri: string,
  state?: string
): string {
  const code = generateToken(32);
  authCodes.set(code, {
    codeChallenge,
    redirectUri,
    state,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });
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

// In-memory store for dynamically registered clients (claude.ai / Cowork use DCR)
const dynamicClients = new Map<string, OAuthClientInformationFull>();

const clientsStore: OAuthRegisteredClientsStore = {
  getClient(clientId) {
    if (clientId === "shareduo") return getStaticClient();
    return dynamicClients.get(clientId);
  },

  // Dynamic Client Registration (RFC 7591). Security lives in the password
  // page at /authorize — any client may register, but only token-holders
  // get authorization codes. We force public-client semantics so no secret
  // is required at /token (claude.ai doesn't send one).
  async registerClient(client) {
    const client_id = generateToken(16);
    const registered: OAuthClientInformationFull = {
      ...client,
      client_id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      token_endpoint_auth_method: "none",
    };
    dynamicClients.set(client_id, registered);
    console.log(`[oauth] registerClient → ${client_id} redirect_uris=${JSON.stringify(registered.redirect_uris)}`);
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

    // Show password page — actual code issuance happens in POST /authorize
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
      const record = authCodes.get(authorizationCode);
      if (!record || Date.now() > record.expiresAt) {
        throw new InvalidGrantError("Invalid or expired authorization code");
      }
      return record.codeChallenge;
    },

    async exchangeAuthorizationCode(
      client: OAuthClientInformationFull,
      authorizationCode: string
    ): Promise<OAuthTokens> {
      console.log(`[oauth] exchangeAuthorizationCode client=${client.client_id} code=${authorizationCode.slice(0, 8)}...`);
      const record = authCodes.get(authorizationCode);
      if (!record || Date.now() > record.expiresAt) {
        console.log(`[oauth] exchangeAuthorizationCode FAILED: record=${!!record} expired=${record ? Date.now() > record.expiresAt : false}`);
        throw new InvalidGrantError("Invalid or expired authorization code");
      }
      authCodes.delete(authorizationCode);

      const accessToken  = generateToken(32);
      const refreshToken = generateToken(32);
      const expiresIn    = 3600;

      accessTokens.set(accessToken, {
        clientId: client.client_id,
        expiresAt: Date.now() + expiresIn * 1000,
      });
      refreshTokens.set(refreshToken, {
        clientId: client.client_id,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      return {
        access_token:  accessToken,
        token_type:    "bearer",
        expires_in:    expiresIn,
        refresh_token: refreshToken,
      };
    },

    async exchangeRefreshToken(
      client: OAuthClientInformationFull,
      refreshToken: string
    ): Promise<OAuthTokens> {
      const record = refreshTokens.get(refreshToken);
      if (!record || Date.now() > record.expiresAt || record.clientId !== client.client_id) {
        throw new InvalidGrantError("Invalid or expired refresh token");
      }
      refreshTokens.delete(refreshToken);

      const accessToken     = generateToken(32);
      const newRefreshToken = generateToken(32);
      const expiresIn       = 3600;

      accessTokens.set(accessToken, {
        clientId: client.client_id,
        expiresAt: Date.now() + expiresIn * 1000,
      });
      refreshTokens.set(newRefreshToken, {
        clientId: client.client_id,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      return {
        access_token:  accessToken,
        token_type:    "bearer",
        expires_in:    expiresIn,
        refresh_token: newRefreshToken,
      };
    },

    async verifyAccessToken(token: string): Promise<AuthInfo> {
      const record = accessTokens.get(token);
      if (!record || Date.now() > record.expiresAt) {
        console.log(`[oauth] verifyAccessToken FAILED: tokenPrefix=${token.slice(0, 8)}... known=${!!record} expired=${record ? Date.now() > record.expiresAt : false}`);
        throw new InvalidTokenError("Invalid or expired access token");
      }
      console.log(`[oauth] verifyAccessToken OK client=${record.clientId}`);
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
      accessTokens.delete(request.token);
      refreshTokens.delete(request.token);
    },
  };
}
