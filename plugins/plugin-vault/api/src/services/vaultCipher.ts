import { argon2Sync, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VAULT_HEADER = "enc:v1";
const VAULT_AAD = Buffer.from(VAULT_HEADER, "utf8");
const VAULT_KDF_NONCE = Buffer.from("cms-vault-kdf-v1", "utf8");
const IV_BYTE_LENGTH = 12;
const AUTH_TAG_BYTE_LENGTH = 16;

export function deriveVaultKey(secret: string): Buffer {
  return argon2Sync("argon2id", {
    message: secret,
    nonce: VAULT_KDF_NONCE,
    parallelism: 1,
    tagLength: 32,
    memory: 19456,
    passes: 2,
  });
}

export function encryptVaultPassword(plainText: string, key: Buffer): string {
  if (!plainText) return plainText;
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_BYTE_LENGTH,
  });
  cipher.setAAD(VAULT_AAD);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${VAULT_HEADER}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptVaultPassword(storedValue: string, key: Buffer): string {
  if (!storedValue || !storedValue.startsWith(`${VAULT_HEADER}:`)) {
    throw new Error("Invalid or unencrypted vault password payload");
  }
  const parts = storedValue.split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted password format in vault");
  }
  const [, , ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex!, "hex");
  const tag = Buffer.from(tagHex!, "hex");
  if (iv.byteLength !== IV_BYTE_LENGTH || tag.byteLength !== AUTH_TAG_BYTE_LENGTH) {
    throw new Error("Invalid IV or authentication tag length in vault payload");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_BYTE_LENGTH,
  });
  decipher.setAAD(VAULT_AAD);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(cipherHex!, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
