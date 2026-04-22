import { z } from "zod";
import { uploadArtifact } from "../lib/client.js";

export const pushArtifactSchema = {
  name: "push_artifact",
  description:
    "Upload an HTML artifact to ShareDuo and get a shareable preview link. " +
    "The content MUST be a complete, standalone HTML document with <!DOCTYPE html>, " +
    "<html>, <head>, and <body> tags — not plain text, markdown, or a code fragment. " +
    "If the user asks you to share non-HTML content, wrap it in a proper HTML document first " +
    "(with reasonable styling so it's readable in a browser). " +
    "IMPORTANT: Before calling this tool, always ask the user TWO things: " +
    "(1) 'Do you want to password-protect this artifact? Passwords cannot be added after upload.' " +
    "If yes, ask them what password to use. If no, pass an empty string for `password`. " +
    "(2) 'How long should this link stay live? 1 hour, 1 day, 7 days, or 30 days (default 30 days).' " +
    "Pass the matching `expires_in` value; omit it to accept the 30-day default. " +
    "Returns the slug, preview URL, expiration timestamp, and a secret_token needed to delete it later.",
  inputSchema: {
    type: "object" as const,
    required: ["html"] as string[],
    properties: {
      html: {
        type: "string",
        description:
          "A complete HTML document (must include <!DOCTYPE html> or an <html> tag). " +
          "Plain text or markdown will be rejected.",
      },
      password: {
        type: "string",
        description:
          "Optional. Omit = use default password. Empty string = no password. Any other value = custom password.",
      },
      expires_in: {
        type: "string",
        enum: ["1h", "1d", "7d", "30d"],
        description:
          "How long the preview link stays live. Omit to default to 30 days. " +
          "Use shorter values for one-off shares that shouldn't linger.",
      },
    },
  },
};

// Lenient check: we accept anything that looks like HTML. The preview server
// renders whatever we store, so bad input becomes a bad preview — not a
// security issue, just a UX one.
function looksLikeHtml(s: string): boolean {
  const lower = s.trimStart().toLowerCase();
  if (lower.startsWith("<!doctype html")) return true;
  if (lower.startsWith("<html")) return true;
  // Accept fragments that contain any HTML tag — Claude sometimes sends
  // just <body>…</body> and that still renders OK in a browser.
  return /<[a-z][a-z0-9]*(\s[^>]*)?>/i.test(s);
}

const InputSchema = z.object({
  html: z
    .string()
    .min(1, "html must not be empty")
    .refine(looksLikeHtml, {
      message:
        "Content doesn't look like HTML. Wrap it in a complete HTML document " +
        "(with <!DOCTYPE html>, <html>, <head>, <body>) before uploading.",
    }),
  password:   z.string().optional(),
  expires_in: z.enum(["1h", "1d", "7d", "30d"]).optional(),
});

function formatExpiry(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `${Math.max(1, hours)}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export async function handlePushArtifact(args: unknown) {
  const { html, password, expires_in } = InputSchema.parse(args);
  const result = await uploadArtifact(html, password, expires_in);

  const manageLine = result.manage_url
    ? `**Manage URL:** ${result.manage_url}\n`
    : "";
  const hint = result.manage_url
    ? `_Save the manage URL — open it anytime to see views, or to delete this artifact._`
    : `_Save the secret token if you want to delete this artifact later._`;

  return {
    content: [
      {
        type: "text" as const,
        text:
          `✅ Artifact uploaded successfully!\n\n` +
          `**Preview URL:** ${result.preview_url}\n` +
          manageLine +
          `**Slug:** ${result.slug}\n` +
          `**Expires in:** ${formatExpiry(result.expires_at)}\n` +
          `**Secret token:** ${result.secret_token}\n\n` +
          hint,
      },
    ],
  };
}
