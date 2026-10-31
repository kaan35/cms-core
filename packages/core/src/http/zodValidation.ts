import type { FastifyInstance, FastifySchema } from "fastify";
import { z } from "zod";
import { ValidationError } from "../errors/AppError.js";
import { formatZodIssues } from "../utils/validation.js";

const OPENAPI_PARTS = ["body", "querystring", "params", "headers"] as const;

export function registerZodValidation(app: FastifyInstance): void {
  app.setValidatorCompiler(({ schema, httpPart }) => {
    if (!(schema instanceof z.ZodType)) {
      throw new Error(`Route ${httpPart ?? "unknown"} schema must be a Zod schema`);
    }
    if (httpPart === "body") {
      // Body is validated exactly once by domain service; route schema documents it for OpenAPI
      return (data) => ({ value: data });
    }
    return (data) => {
      const result = schema.safeParse(data);
      return result.success
        ? { value: result.data }
        : { error: new ValidationError(`Invalid ${httpPart}: ${formatZodIssues(result.error)}`) };
    };
  });

  app.setSerializerCompiler(
    () => (data) =>
      typeof data === "string" || Buffer.isBuffer(data)
        ? (data as unknown as string)
        : JSON.stringify(data),
  );
}

export function zodSchemaToOpenApi(schema: FastifySchema): FastifySchema {
  const converted: Record<string, unknown> = { ...schema };
  for (const part of OPENAPI_PARTS) {
    const value = converted[part];
    if (value instanceof z.ZodType) {
      converted[part] = z.toJSONSchema(value, {
        target: "openapi-3.0",
        io: "input",
        unrepresentable: "any",
      });
    }
  }
  if (converted["response"] && typeof converted["response"] === "object") {
    const responses: Record<string, unknown> = {
      ...(converted["response"] as Record<string, unknown>),
    };
    for (const [statusCode, resSchema] of Object.entries(responses)) {
      if (resSchema instanceof z.ZodType) {
        responses[statusCode] = z.toJSONSchema(resSchema, {
          target: "openapi-3.0",
          io: "output",
          unrepresentable: "any",
        });
      }
    }
    converted["response"] = responses;
  }
  return converted as FastifySchema;
}
