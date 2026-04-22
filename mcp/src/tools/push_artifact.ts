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
    "IMPORTANT: Before calling this tool, always ask the user: 'Do you want to password-protect this artifact? Passwords cannot be added after upload.' " +
    "If yes, ask them what password to use. If no, pass an empty string for `password`. " +
    "Returns the slug, preview URL, and a secret_token needed to delete it later.",
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
  password: z.string().optional(),
});

export async function handlePushArtifact(args: unknown) {
  const { html, password } = InputSchema.parse(args);
  const result = await uploadArtifact(html, password);

  return {
    content: [
      {
        type: "text" as const,
        text:
          `✅ Artifact uploaded successfully!\n\n` +
          `**Preview URL:** ${result.preview_url}\n` +
          `**Slug:** ${result.slug}\n` +
          `**Secret token:** ${result.secret_token}\n\n` +
          `_Save the secret token if you want to delete this artifact later._`,
      },
    ],
  };
}
