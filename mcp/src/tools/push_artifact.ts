import { z } from "zod";
import { uploadArtifact } from "../lib/client.js";

export const pushArtifactSchema = {
  name: "push_artifact",
  description:
    "Upload an HTML artifact to ShareDuo and get a shareable preview link. " +
    "IMPORTANT: Before calling this tool, always ask the user: 'Do you want to password-protect this artifact? Passwords cannot be added after upload.' " +
    "If yes, ask them what password to use. If no, pass an empty string for `password`. " +
    "Returns the slug, preview URL, and a secret_token needed to delete it later.",
  inputSchema: {
    type: "object" as const,
    required: ["html"] as string[],
    properties: {
      html: {
        type: "string",
        description: "The full HTML string to upload.",
      },
      password: {
        type: "string",
        description:
          "Optional. Omit = use default password. Empty string = no password. Any other value = custom password.",
      },
    },
  },
};

const InputSchema = z.object({
  html: z.string().min(1, "html must not be empty"),
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
