/**
 * AES-256-GCM encryption for storing sensitive credentials in MongoDB.
 * Requires ENCRYPTION_KEY env var: 64 hex characters (32 bytes).
 * Generate with: openssl rand -hex 32
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM  = "aes-256-gcm";
const KEY_BYTES  = 32;
const IV_BYTES   = 12;

function getKey(): Buffer {
  const k = process.env.ENCRYPTION_KEY;
  if (!k) throw new Error("ENCRYPTION_KEY is not set");
  const buf = Buffer.from(k, "hex");
  if (buf.length !== KEY_BYTES)
    throw new Error(`ENCRYPTION_KEY must be ${KEY_BYTES * 2} hex characters (got ${buf.length * 2})`);
  return buf;
}

/** Encrypt a UTF-8 string → "iv:authTag:ciphertext" (all hex) */
export function encrypt(plaintext: string): string {
  const key       = getKey();
  const iv        = randomBytes(IV_BYTES);
  const cipher    = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag       = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a "iv:authTag:ciphertext" string → original UTF-8 plaintext */
export function decrypt(ciphertext: string): string {
  const key    = getKey();
  const parts  = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext — expected iv:tag:data format");
  const [ivHex, tagHex, dataHex] = parts;
  const iv       = Buffer.from(ivHex,   "hex");
  const tag      = Buffer.from(tagHex,  "hex");
  const data     = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

/** Encrypt a JSON-serialisable value */
export function encryptJSON(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

/** Decrypt and JSON.parse a previously encrypted value */
export function decryptJSON<T = unknown>(ciphertext: string): T {
  return JSON.parse(decrypt(ciphertext)) as T;
}
