import type { z } from "zod";
import { ValidationError } from "../errors/AppError.js";

export function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
}

export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
  messagePrefix = "Validation failed",
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(`${messagePrefix}: ${formatZodIssues(result.error)}`);
  }
  return result.data;
}
