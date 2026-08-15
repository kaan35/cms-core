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
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
