function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const env = {
  apiKey:          requireEnv("SHAREDUO_API_KEY"),
  baseUrl:         requireEnv("SHAREDUO_BASE_URL").replace(/\/$/, ""),
  defaultPassword: process.env.SHAREDUO_DEFAULT_PASSWORD ?? "",
};
