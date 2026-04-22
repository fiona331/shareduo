function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const env = {
  apiKey:          requireEnv("SHAREDUO_API_KEY"),
  // SHAREDUO_BASE_URL here is the ShareDuo web app (for uploading artifacts)
  baseUrl:         requireEnv("SHAREDUO_BASE_URL").replace(/\/$/, ""),
  defaultPassword: process.env.SHAREDUO_DEFAULT_PASSWORD ?? "",
  // SHAREDUO_MCP_TOKEN is required for OAuth client authentication
  mcpToken:        requireEnv("SHAREDUO_MCP_TOKEN"),
  // Upstash Redis — optional. When set, OAuth state (auth codes, tokens,
  // dynamic clients) persists across restarts. Falls back to in-memory
  // when unset (fine for local dev; loses all sessions on restart).
  upstashRedisUrl:   process.env.UPSTASH_REDIS_REST_URL   ?? "",
  upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
};
