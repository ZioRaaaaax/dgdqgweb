import { Redis } from "@upstash/redis";

const SESSION_TTL = 60 * 60; // 1 heure
const memoryStore = globalThis.__sessionStore ?? new Map();
globalThis.__sessionStore = memoryStore;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return new Redis({ url, token });
}

export async function createSession(data) {
  const sessionId = crypto.randomUUID();
  const session = {
    status: "pending",
    username: data.username,
    phone: data.phone,
    carrier: data.carrier,
    createdAt: Date.now(),
  };

  const redis = getRedis();

  if (redis) {
    await redis.set(`session:${sessionId}`, session, { ex: SESSION_TTL });
  } else {
    memoryStore.set(sessionId, session);
    setTimeout(() => memoryStore.delete(sessionId), SESSION_TTL * 1000);
  }

  return sessionId;
}

export async function getSessionStatus(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return "not_found";

  const redis = getRedis();
  let session;

  if (redis) {
    session = await redis.get(`session:${sessionId}`);
  } else {
    session = memoryStore.get(sessionId);
  }

  if (!session) return "not_found";

  return session.status === "approved" ? "approved" : "pending";
}

export async function approveSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return false;

  const redis = getRedis();
  let session;

  if (redis) {
    session = await redis.get(`session:${sessionId}`);
  } else {
    session = memoryStore.get(sessionId);
  }

  if (!session || session.status === "approved") return false;

  session.status = "approved";

  if (redis) {
    await redis.set(`session:${sessionId}`, session, { ex: SESSION_TTL });
  } else {
    memoryStore.set(sessionId, session);
  }

  return true;
}
