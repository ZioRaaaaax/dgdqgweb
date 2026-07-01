export const config = {
  runtime: "edge",
};

import { handleDiscordInteraction } from "../lib/discord-interaction.js";

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const result = await handleDiscordInteraction(rawBody, signature, timestamp);

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Discord interaction error:", error);
    return new Response(JSON.stringify({ error: "Interaction failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
