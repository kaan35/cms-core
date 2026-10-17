import bcrypt from "bcrypt";

export function getDefaultSaltRounds(): number {
  const envVal = process.env["BCRYPT_SALT_ROUNDS"];
  const parsed = envVal ? Number.parseInt(envVal, 10) : NaN;
  return Number.isNaN(parsed) ? 12 : parsed;
}

export function getDefaultPasswordMinLength(): number {
  const envVal = process.env["PASSWORD_MIN_LENGTH"];
  const parsed = envVal ? Number.parseInt(envVal, 10) : NaN;
  return Number.isNaN(parsed) ? 8 : parsed;
}

// bcrypt silently truncates inputs beyond 72 UTF-8 bytes; reject longer inputs to prevent entropy truncation and CPU DoS.
export const MAX_BCRYPT_PASSWORD_BYTES = 72;

export function validatePasswordStrength(
  password: string,
  minLength = getDefaultPasswordMinLength(),
): { valid: boolean; error?: string } {
  if (!password || password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters long`,
    };
  }
  if (Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES) {
    return {
      valid: false,
      error: `Password must not exceed ${MAX_BCRYPT_PASSWORD_BYTES} bytes`,
    };
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain both letters and numbers",
    };
  }
  return { valid: true };
}

export async function hashPassword(
  password: string,
  saltRounds = getDefaultSaltRounds(),
): Promise<string> {
  if (Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES) {
    throw new Error(`Password must not exceed ${MAX_BCRYPT_PASSWORD_BYTES} bytes`);
  }
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Reject oversized inputs before invoking bcrypt to prevent 72-byte truncation collisions and CPU DoS.
  if (Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

// Pre-computes a valid bcrypt hash at the active cost factor so login can execute a constant-work
// comparison when an email does not exist, preventing user enumeration via response timing.
export function createDummyPasswordHash(saltRounds = getDefaultSaltRounds()): string {
  return bcrypt.hashSync("cms-timing-equalizer-dummy-secret-99", saltRounds);
}
