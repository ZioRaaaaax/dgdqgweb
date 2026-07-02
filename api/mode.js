import { getSiteMode } from "../lib/site-mode.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false });
    return;
  }

  const mode = await getSiteMode();
  res.status(200).json({ ok: true, mode });
}
