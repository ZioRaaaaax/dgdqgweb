import {
  processRequest,
  processVerify,
  processResend,
  validatePayload,
} from "../lib/handle-submit.js";
import { createSession, submitCode, resetForResend } from "../lib/session-store.js";
import {
  sendApprovalRequest,
  sendCodeVerificationRequest,
  sendCodeResendNotification,
} from "../lib/discord.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  try {
    const payload = validatePayload(req.body);

    if (payload.type === "request") {
      const result = await processRequest(payload, { createSession, sendApprovalRequest });
      res.status(200).json(result);
      return;
    }

    if (payload.type === "verify") {
      const result = await processVerify(payload, {
        submitCode,
        sendCodeVerificationRequest,
      });
      res.status(200).json(result);
      return;
    }

    const result = await processResend(payload, {
      resetForResend,
      sendCodeResendNotification,
    });
    res.status(200).json(result);
  } catch {
    res.status(400).json({ ok: false });
  }
}
