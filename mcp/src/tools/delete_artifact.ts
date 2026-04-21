import { z } from "zod";
import { deleteArtifact } from "../lib/client.js";

export const deleteArtifactSchema = {
  name: "delete_artifact",
  description:
    "Delete a previously uploaded ShareDuo artifact. " +
    "Requires the slug and the secret_token that were returned when the artifact was uploaded.",
  inputSchema: {
    type: "object" as const,
    required: ["slug", "secret_token"] as string[],
    properties: {
      slug: {
        type: "string",
        description: "The artifact slug returned by push_artifact.",
      },
      secret_token: {
        type: "string",
        description: "The secret token returned by push_artifact.",
      },
    },
  },
};

const InputSchema = z.object({
  slug: z.string().min(1),
  secret_token: z.string().min(1),
});

export async function handleDeleteArtifact(args: unknown) {
  const { slug, secret_token } = InputSchema.parse(args);
  await deleteArtifact(slug, secret_token);
  return {
    content: [
      {
        type: "text" as const,
        text: `✅ Artifact \`${slug}\` has been deleted.`,
      },
    ],
  };
}
