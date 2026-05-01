import { z } from "zod";
import { updateArtifact } from "../lib/client.js";

export const updateArtifactSchema = {
  name: "update_artifact",
  description:
    "Replace the HTML content of an existing ShareDuo artifact without changing its URL. " +
    "The preview link stays exactly the same — only the content changes. " +
    "Requires the slug and secret_token that were returned by push_artifact. " +
    "Before calling, ask the user: " +
    "(1) 'Do you want to change the expiry at the same time? If so, how long: 1h, 1d, 7d, 30d, or permanent.' " +
    "Omit expires_in to keep the existing expiry. " +
    "Note: if the artifact is already expired, expires_in is required to revive it.",
  inputSchema: {
    type: "object" as const,
    required: ["slug", "secret_token", "html"] as string[],
    properties: {
      slug: {
        type: "string",
        description: "The artifact slug returned by push_artifact.",
      },
      secret_token: {
        type: "string",
        description: "The secret token returned by push_artifact.",
      },
      html: {
        type: "string",
        description:
          "The new complete HTML document to replace the existing content. " +
          "Must include <!DOCTYPE html> or an <html> tag.",
      },
      expires_in: {
        type: "string",
        enum: ["1h", "1d", "7d", "30d", "permanent"],
        description:
          "Optional. New expiry for the artifact. Omit to keep the existing expiry. " +
          "Required if the artifact has already expired.",
      },
    },
  },
};

function looksLikeHtml(s: string): boolean {
  const lower = s.trimStart().toLowerCase();
  if (lower.startsWith("<!doctype html")) return true;
  if (lower.startsWith("<html")) return true;
  return /<[a-z][a-z0-9]*(\s[^>]*)?>/i.test(s);
}

const InputSchema = z.object({
  slug:         z.string().min(1),
  secret_token: z.string().min(1),
  html: z
    .string()
    .min(1, "html must not be empty")
    .refine(looksLikeHtml, {
      message:
        "Content doesn't look like HTML. Wrap it in a complete HTML document " +
        "(with <!DOCTYPE html>, <html>, <head>, <body>) before uploading.",
    }),
  expires_in: z.enum(["1h", "1d", "7d", "30d", "permanent"]).optional(),
});

export async function handleUpdateArtifact(args: unknown) {
  const { slug, secret_token, html, expires_in } = InputSchema.parse(args);
  const result = await updateArtifact(slug, secret_token, html, expires_in);

  return {
    content: [
      {
        type: "text" as const,
        text:
          `✅ Artifact updated successfully!\n\n` +
          `**Preview URL:** ${result.preview_url} _(unchanged)_\n` +
          `**Updated at:** ${new Date(result.updated_at).toLocaleString()}\n\n` +
          `_The preview link is the same as before — anyone who already has it will see the new version._`,
      },
    ],
  };
}
