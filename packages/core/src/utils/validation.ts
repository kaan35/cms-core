import type { z } from "zod";
import { ValidationError } from "../errors/AppError.js";

export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  data: unknown,
  messagePrefix = "Validation failed",
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    throw new ValidationError(`${messagePrefix}: ${errorDetails}`);
  }
  return result.data;
}
