import { processRequest, processVerify, validatePayload } from "../lib/handle-submit.js";
import { createSession } from "../lib/session-store.js";
import { sendApprovalRequest, sendWebhookEmbed } from "../lib/discord.js";

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

    const result = await processVerify(payload, { sendWebhookEmbed });
    res.status(200).json(result);
  } catch {
    res.status(400).json({ ok: false });
  }
}
