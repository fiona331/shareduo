import { env } from "./env.js";

export interface UploadResult {
  slug: string;
  secret_token: string;
  preview_url: string;
  delete_url: string;
}

/**
 * Upload an HTML artifact to ShareDuo.
 * password: undefined  → use SHAREDUO_DEFAULT_PASSWORD
 * password: ""         → no password (public)
 * password: "abc"      → use "abc" as the password
 */
export async function uploadArtifact(
  html: string,
  password: string | undefined
): Promise<UploadResult> {
  const form = new FormData();
  form.append("html", html);

  const resolvedPassword =
    password === undefined ? env.defaultPassword : password;
  if (resolvedPassword) {
    form.append("password", resolvedPassword);
  }

  const res = await fetch(`${env.baseUrl}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<UploadResult>;
}

export async function deleteArtifact(
  slug: string,
  secretToken: string
): Promise<void> {
  const res = await fetch(`${env.baseUrl}/api/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ secret_token: secretToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed (${res.status}): ${text}`);
  }
}
