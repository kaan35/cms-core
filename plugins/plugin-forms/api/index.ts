import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { hooks } from "@cms/core";

// Zod Form Field Schema
const fieldSchema = z.object({
  name: z.string(),
  type: z.enum(["text", "email", "textarea", "number"]),
  label: z.string(),
  required: z.boolean().default(true),
});

// Zod Form Structure Schema
const formSchema = z.object({
  formId: z.string().min(1),
  name: z.string().min(1),
  fields: z.array(fieldSchema),
});

export const name = "@cms/plugin-forms-api";
export const version = "1.0.0";

export async function register(fastify: FastifyInstance, options: any) {
  const db = (fastify as any).db;
  const logger = (fastify as any).logger;
  const authenticate = (fastify as any).authenticate;
  const checkPermission = (fastify as any).checkPermission;

  logger.info("📋 Plugin-Forms: Initializing forms and submission routes...");

  const formsCol = db.getCollection("cms_forms");
  const submissionsCol = db.getCollection("cms_form_submissions");

  // Middleware: Check if plugin is enabled
  const checkPluginEnabled = async (request: FastifyRequest, reply: FastifyReply) => {
    const { PluginLoader } = await import("@cms/core");
    if (!PluginLoader.isEnabled(name)) {
      reply.status(503).send({ 
        status: "error", 
        message: "Forms plugin is currently disabled" 
      });
    }
  };

  // Get all forms
  fastify.get("/forms", { preHandler: [checkPluginEnabled] }, async () => {
    const forms = await formsCol.find({}).toArray();
    return { status: "success", forms };
  });

  // Get form by ID
  fastify.get("/forms/:formId", { preHandler: [checkPluginEnabled] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as { formId: string };
    const form = await formsCol.findOne({ formId });
    if (!form) {
      reply.status(404).send({ status: "error", message: "Form not found" });
      return;
    }
    return { status: "success", form };
  });

  // Create form structure
  fastify.post(
    "/forms",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("forms:write")],
      schema: {
        body: formSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof formSchema>;

      const existing = await formsCol.findOne({ formId: body.formId });
      if (existing) {
        reply.status(400).send({ status: "error", message: "Form ID already exists" });
        return;
      }

      await formsCol.insertOne({
        ...body,
        createdAt: new Date(),
      });

      return { status: "success", form: body };
    }
  );

  // Update form structure
  fastify.put(
    "/forms/:formId",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("forms:write")],
      schema: {
        body: z.object({
          name: z.string().min(1),
          fields: z.array(fieldSchema),
        }),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { formId } = request.params as { formId: string };
      const body = request.body as any;

      const form = await formsCol.findOne({ formId });
      if (!form) {
        reply.status(404).send({ status: "error", message: "Form not found" });
        return;
      }

      await formsCol.updateOne(
        { formId },
        {
          $set: {
            name: body.name,
            fields: body.fields,
          },
        }
      );

      return { status: "success", message: "Form updated successfully" };
    }
  );

  // Delete form
  fastify.delete(
    "/forms/:formId",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("forms:delete")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { formId } = request.params as { formId: string };
      const result = await formsCol.deleteOne({ formId });
      if (result.deletedCount === 0) {
        reply.status(404).send({ status: "error", message: "Form not found" });
        return;
      }
      return { status: "success", message: "Form deleted successfully" };
    }
  );

  // Submit form data (PUBLIC endpoint)
  fastify.post("/forms/:formId/submit", { preHandler: [checkPluginEnabled] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as { formId: string };
    const inputData = request.body as Record<string, any>;

    const form = await formsCol.findOne({ formId });
    if (!form) {
      reply.status(404).send({ status: "error", message: "Form not found" });
      return;
    }

    // Dynamic Validation
    const errors: Array<{ field: string; message: string }> = [];
    const sanitizedData: Record<string, any> = {};

    for (const field of form.fields) {
      const val = inputData[field.name];

      // Required Check
      if (field.required && (val === undefined || val === null || val === "")) {
        errors.push({ field: field.name, message: `${field.label} is required` });
        continue;
      }

      if (val !== undefined && val !== null && val !== "") {
        // Email check
        if (field.type === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            errors.push({ field: field.name, message: `Invalid email address` });
            continue;
          }
        }
        // Number check
        if (field.type === "number") {
          if (isNaN(Number(val))) {
            errors.push({ field: field.name, message: `Must be a number` });
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

    // Save Submission
    const submission = {
      formId,
      data: sanitizedData,
      createdAt: new Date(),
    };
    await submissionsCol.insertOne(submission);

    // Emit event
    hooks.emit("form.submitted", submission, form.name, request.ip);

    return {
      status: "success",
      message: "Form submitted successfully",
    };
  });

  // Get all submissions for a form (with pagination)
  fastify.get(
    "/forms/:formId/submissions",
    {
      preHandler: [checkPluginEnabled, authenticate, checkPermission("forms:read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { formId } = request.params as { formId: string };
      const query = request.query as any;
      
      // Pagination params
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get total count
      const total = await submissionsCol.countDocuments({ formId });
      
      // Get paginated submissions
      const submissions = await submissionsCol
        .find({ formId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return {
        status: "success",
        items: submissions,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }
  );
}

export default {
  name,
  version,
  register,
};
