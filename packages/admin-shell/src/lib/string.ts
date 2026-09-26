export function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: "c",
    Ç: "c",
    ğ: "g",
    Ğ: "g",
    ı: "i",
    I: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ş: "s",
    Ş: "s",
    ü: "u",
    Ü: "u",
  };

  return text
    .split("")
    .map((c) => trMap[c] || c)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function toSnakeCase(text: string): string {
  return slugify(text).replace(/-/g, "_");
}

export function truncate(text: string, maxLength: number, suffix = "..."): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + suffix;
}

export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function generateSecurePassword(length = 18): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
  const charsLen = chars.length;
  const maxValid = 256 - (256 % charsLen);
  const cryptoObj =
    typeof globalThis !== "undefined" && globalThis.crypto
      ? globalThis.crypto
      : typeof window !== "undefined" && window.crypto
        ? window.crypto
        : null;

  if (!cryptoObj) {
    throw new Error("Cryptographically secure random number generator is unavailable.");
  }

  let result = "";
  const buf = new Uint8Array(length * 2);

  while (result.length < length) {
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < buf.length && result.length < length; i++) {
      const val = buf[i]!;
      if (val < maxValid) {
        result += chars[val % charsLen];
      }
    }
  }

  return result;
}
