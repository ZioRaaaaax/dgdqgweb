import { processSubmit } from "../lib/handle-submit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  try {
    const result = await processSubmit(req.body);
    res.status(200).json(result);
  } catch {
    res.status(400).json({ ok: false });
  }
}
