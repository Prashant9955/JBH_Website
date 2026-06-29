import crypto from "crypto";

function timingSafeEqualStr(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// PBKDF2-based hash to avoid adding bcrypt dependency.
// Format: pbkdf2$sha256$<iterations>$<saltBase64>$<derivedKeyBase64>
export function hashPassword(password: string) {
  const iterations = 200_000;
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return `pbkdf2$sha256$${iterations}$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 5) return false;
  const [algo, digest, iterationsStr, saltB64, dkB64] = parts;
  if (!algo || !digest || !iterationsStr || !saltB64 || !dkB64) return false;
  if (algo !== "pbkdf2" || digest !== "sha256") return false;
  const iterations = Number(iterationsStr);
  if (!Number.isFinite(iterations) || iterations < 100_000) return false;
  const salt = Buffer.from(saltB64, "base64");
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return timingSafeEqualStr(derivedKey.toString("base64"), dkB64);
}

