import type { PaginationQuery } from "@cms/core";
import {
  BadRequestError,
  buildPaginationMeta,
  createPluginGuard,
  hooks,
  NotFoundError,
  parsePaginationQuery,
} from "@cms/core";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";
import { FormsRepository } from "./FormsRepository.ts";

// Zod Form Field Schema
const fieldSchema = z.object({
  name: z.string(),
  type: z.enum(["text", "email", "textarea", "number"]),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().default(true),
});

// Zod Form Structure Schema
const formSchema = z.object({
  formId: z.string().min(1),
  name: z.string().min(1),
  fields: z.array(fieldSchema),
});

const formUpdateSchema = z.object({
  name: z.string().min(1),
  fields: z.array(fieldSchema),
});

type FormBody = z.infer<typeof formSchema>;
type FormUpdateBody = z.infer<typeof formUpdateSchema>;

export const name = "@cms/plugin-forms-api";
export const version = "1.0.0";

async function register(fastify: FastifyInstance, _options: Record<string, unknown> = {}) {
  const db = fastify.db;
  const logger = fastify.logger;
  const authenticate = fastify.authenticate;
  const checkPermission = fastify.checkPermission;

  logger.info(
    "📋 Plugin-Forms: Initializing forms and submission routes using Repository pattern...",
  );

  const formsRepo = new FormsRepository(db, logger);

  // Check if plugin is enabled globally for all routes in this plugin
  fastify.addHook("preHandler", createPluginGuard(name));

  // Get all forms
  fastify.get("/forms", async () => {
    const forms = await formsRepo.find();
    return { status: "success", forms };
  });

  // Get form by ID
  fastify.get("/forms/:formId", async (request: FastifyRequest) => {
    const { formId } = request.params as { formId: string };
    const form = await formsRepo.findByFormId(formId);
    if (!form) {
      throw new NotFoundError("Form");
    }
    return { status: "success", form };
  });

  // Create form structure
  fastify.post(
    "/forms",
    {
      preHandler: [authenticate, checkPermission("forms:write")],
      schema: { body: formSchema },
    },
    async (request: FastifyRequest) => {
      const body = request.body as FormBody;

      const existing = await formsRepo.findByFormId(body.formId);
      if (existing) {
        throw new BadRequestError("Form ID already exists");
      }

      const createdForm = await formsRepo.createForm(body);
      return { status: "success", form: createdForm };
    },
  );

  // Update form structure
  fastify.put(
    "/forms/:formId",
    {
      preHandler: [authenticate, checkPermission("forms:write")],
      schema: { body: formUpdateSchema },
    },
    async (request: FastifyRequest) => {
      const { formId } = request.params as { formId: string };
      const body = request.body as FormUpdateBody;

      const form = await formsRepo.findByFormId(formId);
      if (!form) {
        throw new NotFoundError("Form");
      }

      await formsRepo.updateForm(formId, body.name, body.fields);
      return { status: "success", message: "Form updated successfully" };
    },
  );

  // Delete form
  fastify.delete(
    "/forms/:formId",
    { preHandler: [authenticate, checkPermission("forms:delete")] },
    async (request: FastifyRequest) => {
      const { formId } = request.params as { formId: string };
      const deleted = await formsRepo.deleteForm(formId);
      if (!deleted) {
        throw new NotFoundError("Form");
      }
      return { status: "success", message: "Form deleted successfully" };
    },
  );

  // Submit form data (PUBLIC endpoint)
  fastify.post("/forms/:formId/submit", async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as { formId: string };
    const inputData = request.body as Record<string, unknown>;

    const form = await formsRepo.findByFormId(formId);
    if (!form) {
      throw new NotFoundError("Form");
    }

    // Dynamic validation
    const errors: Array<{ field: string; message: string }> = [];
    const sanitizedData: Record<string, unknown> = {};

    for (const field of form.fields) {
      const val = inputData[field.name];

      if (field.required && (val === undefined || val === null || val === "")) {
        errors.push({ field: field.name, message: `${field.label} is required` });
        continue;
      }

      if (val !== undefined && val !== null && val !== "") {
        if (field.type === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(val))) {
            errors.push({ field: field.name, message: "Invalid email address" });
            continue;
          }
        }
        if (field.type === "number") {
          if (isNaN(Number(val))) {
            errors.push({ field: field.name, message: "Must be a number" });
            continue;
          }
          sanitizedData[field.name] = Number(val);
          continue;
        }
        sanitizedData[field.name] = val;
      }
    }

    if (errors.length > 0) {
      reply.status(400).send({ status: "error", message: "Validation failed", errors });
      return;
    }

    const submission = await formsRepo.createSubmission(formId, sanitizedData);
    hooks.emit("form.submitted", submission, form.name, request.ip);

    return { status: "success", message: "Form submitted successfully" };
  });

  // Get all submissions for a form (with pagination)
  fastify.get(
    "/forms/:formId/submissions",
    { preHandler: [authenticate, checkPermission("forms:read")] },
    async (request: FastifyRequest) => {
      const { formId } = request.params as { formId: string };
      const { page, limit, skip } = parsePaginationQuery(request.query as PaginationQuery);

      const total = await formsRepo.countSubmissions(formId);
      const items = await formsRepo.findSubmissions(formId, skip, limit);

      return {
        status: "success",
        items,
        meta: buildPaginationMeta(page, limit, total),
      };
    },
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
