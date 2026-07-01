import { getSessionStatus } from "../lib/session-store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false });
    return;
  }

  const sessionId = req.query.id;

  if (!sessionId) {
    res.status(400).json({ ok: false, status: "not_found" });
    return;
  }

  const status = await getSessionStatus(sessionId);
  res.status(200).json({ ok: true, status });
}
