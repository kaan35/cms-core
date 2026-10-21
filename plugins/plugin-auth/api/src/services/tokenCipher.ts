import { argon2Sync, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const TOKEN_CIPHER_HEADER = "enc:tok:v1";
const TOKEN_AAD = Buffer.from(TOKEN_CIPHER_HEADER, "utf8");
const TOKEN_KDF_NONCE = Buffer.from("cms-api-token-kdf-v1", "utf8");
const IV_BYTE_LENGTH = 12;
const AUTH_TAG_BYTE_LENGTH = 16;

export function deriveTokenKey(secret: string): Buffer {
  return argon2Sync("argon2id", {
    message: secret,
    nonce: TOKEN_KDF_NONCE,
    parallelism: 1,
    tagLength: 32,
    memory: 19456,
    passes: 2,
  });
}

export function encryptTokenString(plainText: string, key: Buffer): string {
  if (!plainText) {
    throw new Error("Token string is required for encryption");
  }
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_BYTE_LENGTH,
  });
  cipher.setAAD(TOKEN_AAD);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return `${TOKEN_CIPHER_HEADER}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

export function decryptTokenString(storedValue: string, key: Buffer): string {
  if (!storedValue || !storedValue.startsWith(`${TOKEN_CIPHER_HEADER}:`)) {
    throw new Error("Invalid or unencrypted token payload");
  }
  const parts = storedValue.split(":");
  if (parts.length !== 6) {
    throw new Error("Invalid encrypted token format");
  }
  const [, , , ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex!, "hex");
  const tag = Buffer.from(tagHex!, "hex");
  if (iv.byteLength !== IV_BYTE_LENGTH || tag.byteLength !== AUTH_TAG_BYTE_LENGTH) {
    throw new Error("Invalid IV or authentication tag length");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_BYTE_LENGTH,
  });
  decipher.setAAD(TOKEN_AAD);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(cipherHex!, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
