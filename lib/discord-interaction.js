import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import { approveSession } from "./session-store.js";

export async function handleDiscordInteraction(rawBody, signature, timestamp) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("Discord public key not configured");
  }

  if (!signature || !timestamp || !rawBody) {
    return { status: 401, body: { error: "Missing signature headers" } };
  }

  const isValid = verifyKey(rawBody, signature, timestamp, publicKey);

  if (!isValid) {
    return { status: 401, body: { error: "Invalid signature" } };
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return {
      status: 200,
      body: { type: InteractionResponseType.PONG },
    };
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id ?? "";

    if (customId.startsWith("approve:")) {
      const sessionId = customId.slice("approve:".length);
      const approved = await approveSession(sessionId);
      const originalEmbeds = interaction.message?.embeds ?? [];

      return {
        status: 200,
        body: {
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            embeds: originalEmbeds.map((embed) => ({
              ...embed,
              footer: {
                text: approved
                  ? "✓ Code SMS confirmé comme envoyé"
                  : "⚠️ Session introuvable ou déjà validée",
              },
            })),
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 3,
                    label: approved ? "✓ Code envoyé" : "Déjà validé",
                    custom_id: "approved",
                    disabled: true,
                  },
                ],
              },
            ],
          },
        },
      };
    }
  }

  return {
    status: 400,
    body: { error: "Unknown interaction" },
  };
}
