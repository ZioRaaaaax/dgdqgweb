import { Redis } from "@upstash/redis";

const MODE_KEY = "site:mode";
const VALID_MODES = new Set(["normal", "maintenance"]);

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return new Redis({ url, token });
}

export async function getSiteMode() {
  const redis = getRedis();

  if (redis) {
    const mode = await redis.get(MODE_KEY);
    return VALID_MODES.has(mode) ? mode : "normal";
  }

  return globalThis.__siteMode ?? "normal";
}

export async function setSiteMode(mode) {
  if (!VALID_MODES.has(mode)) {
    throw new Error("Invalid mode");
  }

  const redis = getRedis();

  if (redis) {
    await redis.set(MODE_KEY, mode);
  } else {
    globalThis.__siteMode = mode;
  }

  return mode;
}

export function isAdminUser(userId) {
  const adminIds = process.env.DISCORD_ADMIN_IDS?.split(",").map((id) => id.trim()).filter(Boolean);

  if (!adminIds?.length) return true;

  return adminIds.includes(userId);
}
