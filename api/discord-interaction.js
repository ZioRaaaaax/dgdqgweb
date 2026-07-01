import { handleDiscordInteraction } from "../lib/discord-interaction.js";

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const rawBody = await readRawBody(req);

    const result = await handleDiscordInteraction(rawBody, signature, timestamp);

    res.status(result.status).json(result.body);
  } catch {
    res.status(500).json({ error: "Interaction failed" });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
