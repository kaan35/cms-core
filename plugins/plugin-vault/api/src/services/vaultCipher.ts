import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function deriveVaultKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptVaultPassword(plainText: string, key: Buffer): string {
  if (!plainText) return plainText;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptVaultPassword(storedValue: string, key: Buffer): string {
  if (!storedValue || !storedValue.startsWith("enc:v1:")) {
    // Legacy / unencrypted record fallback
    return storedValue;
  }
  const parts = storedValue.split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted password format in vault");
  }
  const [, , ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex!, "hex");
  const tag = Buffer.from(tagHex!, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(cipherHex!, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
