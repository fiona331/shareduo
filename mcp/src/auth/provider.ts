import { randomBytes } from "crypto";
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

// ---------------------------------------------------------------------------
// In-memory stores (cleared on restart — users re-auth automatically via
// the refresh token flow, or just reconnect the connector)
// ---------------------------------------------------------------------------

interface AuthCodeRecord {
  codeChallenge: string;
  expiresAt: number;
}

interface TokenRecord {
  clientId: string;
  expiresAt: number;
}

const authCodes  = new Map<string, AuthCodeRecord>();
const accessTokens  = new Map<string, TokenRecord>();
const refreshTokens = new Map<string, TokenRecord>();

// ---------------------------------------------------------------------------
// Pre-registered client
// Client ID:     shareduo
// Client Secret: SHAREDUO_MCP_TOKEN env var
//
// The SDK's token handler validates client_secret automatically against the
// value returned here, so we never need to check it ourselves.
// ---------------------------------------------------------------------------

function getRegisteredClient(): OAuthClientInformationFull {
  return {
    client_id: "shareduo",
    client_secret: process.env.SHAREDUO_MCP_TOKEN!,
    client_secret_expires_at: 0, // never expires
    client_id_issued_at: 0,
    redirect_uris: [
      "https://claude.ai/api/mcp/auth_callback",  // Cowork / claude.ai
      "http://localhost",                           // Claude Code (any port)
      "http://127.0.0.1",                           // Claude Code (any port)
    ],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
  };
}

const clientsStore: OAuthRegisteredClientsStore = {
  getClient(clientId) {
    if (clientId === "shareduo") return getRegisteredClient();
    return undefined;
  },
  // No dynamic registration — only the pre-registered "shareduo" client
};

// ---------------------------------------------------------------------------
// OAuth provider
// ---------------------------------------------------------------------------

export function createOAuthProvider(): OAuthServerProvider {
  return {
    get clientsStore(): OAuthRegisteredClientsStore {
      return clientsStore;
    },

    // Auto-authorize: security is enforced at the token exchange step
    // (SDK validates client_secret == SHAREDUO_MCP_TOKEN). The authorize
    // step just needs to issue a code and redirect.
    async authorize(
      _client: OAuthClientInformationFull,
      params: AuthorizationParams,
      res: Response
    ): Promise<void> {
      const code = generateToken(32);
      authCodes.set(code, {
        codeChallenge: params.codeChallenge,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      const redirectUrl = new URL(params.redirectUri);
      redirectUrl.searchParams.set("code", code);
      if (params.state) redirectUrl.searchParams.set("state", params.state);
      res.redirect(redirectUrl.toString());
    },

    async challengeForAuthorizationCode(
      _client: OAuthClientInformationFull,
      authorizationCode: string
    ): Promise<string> {
      const record = authCodes.get(authorizationCode);
      if (!record || Date.now() > record.expiresAt) {
        throw new Error("Invalid or expired authorization code");
      }
      return record.codeChallenge;
    },

    async exchangeAuthorizationCode(
      client: OAuthClientInformationFull,
      authorizationCode: string
    ): Promise<OAuthTokens> {
      const record = authCodes.get(authorizationCode);
      if (!record || Date.now() > record.expiresAt) {
        throw new Error("Invalid or expired authorization code");
      }
      authCodes.delete(authorizationCode);

      const accessToken  = generateToken(32);
      const refreshToken = generateToken(32);
      const expiresIn    = 3600; // 1 hour

      accessTokens.set(accessToken, {
        clientId: client.client_id,
        expiresAt: Date.now() + expiresIn * 1000,
      });
      refreshTokens.set(refreshToken, {
        clientId: client.client_id,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      return {
        access_token: accessToken,
        token_type:   "bearer",
        expires_in:   expiresIn,
        refresh_token: refreshToken,
      };
    },

    async exchangeRefreshToken(
      client: OAuthClientInformationFull,
      refreshToken: string
    ): Promise<OAuthTokens> {
      const record = refreshTokens.get(refreshToken);
      if (!record || Date.now() > record.expiresAt || record.clientId !== client.client_id) {
        throw new Error("Invalid or expired refresh token");
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
        throw new Error("Invalid or expired access token");
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
      accessTokens.delete(request.token);
      refreshTokens.delete(request.token);
    },
  };
}
