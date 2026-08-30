import type { FastifyInstance } from "fastify";
import { FORMS_PERMISSIONS } from "./domain/form.rules.js";
import type { FormsController } from "./formsController.js";

export function registerFormsRoutes(app: FastifyInstance, controller: FormsController): void {
  const authenticate = app.authenticate;
  const verifyCsrf = app.verifyCsrf;
  const checkPermission = app.checkPermission;

  // 1. Public Captcha & Submission endpoints
  app.get(
    "/forms/:formId/captcha",
    {
      schema: {
        tags: ["Forms"],
        summary: "Generate SVG challenge captcha for form (public)",
      },
    },
    controller.getCaptcha.bind(controller),
  );

  app.post(
    "/forms/:formId/submissions",
    {
      schema: {
        tags: ["Forms"],
        summary: "Submit form response with captcha verification (public)",
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    controller.submit.bind(controller),
  );

  // 2. Submission Listing (Protected — forms:read)
  app.get(
    "/forms/:formId/submissions",
    {
      schema: {
        tags: ["Forms"],
        summary: "List form submissions (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(FORMS_PERMISSIONS.READ)],
    },
    controller.listSubmissions.bind(controller),
  );

  // 3. Form Definition (Public — required for website client embeds)
  app.get(
    "/forms/:id",
    {
      schema: {
        tags: ["Forms"],
        summary: "Get form schema by ID or slug (public)",
      },
    },
    controller.getForm.bind(controller),
  );

  // 4. Form Admin CRUD (Protected — forms:read / forms:write)
  app.get(
    "/forms",
    {
      schema: {
        tags: ["Forms"],
        summary: "List all forms (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(FORMS_PERMISSIONS.READ)],
    },
    controller.listForms.bind(controller),
  );

  app.post(
    "/forms",
    {
      schema: {
        tags: ["Forms"],
        summary: "Create a new form definition (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.createForm.bind(controller),
  );

  app.put(
    "/forms/:id",
    {
      schema: {
        tags: ["Forms"],
        summary: "Update an existing form definition (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.updateForm.bind(controller),
  );

  app.delete(
    "/forms/:id",
    {
      schema: {
        tags: ["Forms"],
        summary: "Delete a form definition (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.deleteForm.bind(controller),
  );
}
