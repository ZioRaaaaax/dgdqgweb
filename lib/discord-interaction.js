import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import { approveSession } from "./session-store.js";

function disabledButtonRow(approved) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: approved ? "✓ Code envoyé" : "Session introuvable",
          custom_id: "done",
          disabled: true,
        },
      ],
    },
  ];
}

async function updateInteractionMessage(interaction, approved) {
  const applicationId = interaction.application_id;
  const token = interaction.token;

  if (!applicationId || !token) return;

  await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        components: disabledButtonRow(approved),
      }),
    },
  );
}

export async function handleDiscordInteraction(rawBody, signature, timestamp) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();

  if (!publicKey) {
    throw new Error("Discord public key not configured");
  }

  if (!signature || !timestamp || !rawBody) {
    return { status: 401, body: { error: "Missing signature headers" } };
  }

  const isValid = await verifyKey(rawBody, signature, timestamp, publicKey);

  if (!isValid) {
    console.error("Discord signature invalid — vérifie DISCORD_PUBLIC_KEY sur Vercel");
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

      return {
        status: 200,
        body: { type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE },
        afterResponse: async () => {
          const approved = await approveSession(sessionId);
          await updateInteractionMessage(interaction, approved);
        },
      };
    }
  }

  return {
    status: 400,
    body: { error: "Unknown interaction" },
  };
}
