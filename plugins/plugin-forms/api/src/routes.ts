import type { FastifyInstance } from "fastify";
import { FORMS_PERMISSIONS } from "./domain/form.rules.js";
import type { FormsController } from "./formsController.js";

export function registerFormsRoutes(app: FastifyInstance, controller: FormsController): void {
  const authenticate = app.authenticate;
  const verifyCsrf = app.verifyCsrf;
  const checkPermission = app.checkPermission;

  // 1. Public Captcha & Submission endpoints
  app.get("/forms/:formId/captcha", controller.getCaptcha.bind(controller));

  app.post(
    "/forms/:formId/submissions",
    {
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
      preHandler: [authenticate, checkPermission(FORMS_PERMISSIONS.READ)],
    },
    controller.listSubmissions.bind(controller),
  );

  // 3. Form CRUD (Protected — forms:read / forms:write)
  app.get(
    "/forms",
    {
      preHandler: [authenticate, checkPermission(FORMS_PERMISSIONS.READ)],
    },
    controller.listForms.bind(controller),
  );

  app.get(
    "/forms/:id",
    {
      preHandler: [authenticate, checkPermission(FORMS_PERMISSIONS.READ)],
    },
    controller.getForm.bind(controller),
  );

  app.post(
    "/forms",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.createForm.bind(controller),
  );

  app.put(
    "/forms/:id",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.updateForm.bind(controller),
  );

  app.delete(
    "/forms/:id",
    {
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.deleteForm.bind(controller),
  );
}
