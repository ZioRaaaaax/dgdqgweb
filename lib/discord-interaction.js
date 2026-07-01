import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import { approveSession } from "./session-store.js";
import { disableApprovalButton } from "./discord.js";

export async function handleDiscordInteraction(rawBody, signature, timestamp) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("Discord public key not configured");
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

      if (approved && interaction.message) {
        await disableApprovalButton(interaction.message.id, interaction.channel_id);
      }

      return {
        status: 200,
        body: {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: approved
              ? "✅ Code marqué comme envoyé — l'utilisateur peut continuer."
              : "⚠️ Session introuvable ou déjà validée.",
            flags: 64,
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
