import {
  IdParamSchema,
  SearchPaginationQuerySchema,
  type IdParam,
  type SearchPaginationQuery,
} from "@cms/core";
import type { FastifyInstance } from "fastify";
import {
  CreateFormSchema,
  ExportQuerySchema,
  FORMS_PERMISSIONS,
  FormIdParamSchema,
  SubmissionBodySchema,
  UpdateFormSchema,
  type ExportQuery,
  type FormIdParam,
} from "./domain/form.rules.js";
import type { FormsController } from "./formsController.js";

export function registerFormsRoutes(app: FastifyInstance, controller: FormsController): void {
  const authenticate = app.authenticate;
  const verifyCsrf = app.verifyCsrf;
  const checkPermission = app.checkPermission;

  // 1. Public Captcha & Submission endpoints
  app.get<{ Params: FormIdParam }>(
    "/forms/:formId/captcha",
    {
      schema: {
        tags: ["Forms"],
        summary: "Generate SVG challenge captcha for form (public)",
        params: FormIdParamSchema,
      },
    },
    controller.getCaptcha.bind(controller),
  );

  app.post<{ Params: FormIdParam; Body: unknown }>(
    "/forms/:formId/submissions",
    {
      schema: {
        tags: ["Forms"],
        summary: "Submit form response with captcha verification (public)",
        params: FormIdParamSchema,
        body: SubmissionBodySchema,
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

  // 2. Submission Listing & Export (Protected — forms:read)
  app.get<{ Params: FormIdParam; Querystring: SearchPaginationQuery }>(
    "/forms/:formId/submissions",
    {
      schema: {
        tags: ["Forms"],
        summary: "List form submissions (Admin)",
        security: [{ cookieAuth: [] }],
        params: FormIdParamSchema,
        querystring: SearchPaginationQuerySchema,
      },
      preHandler: [authenticate, checkPermission(FORMS_PERMISSIONS.READ)],
    },
    controller.listSubmissions.bind(controller),
  );

  app.get<{ Params: FormIdParam; Querystring: ExportQuery }>(
    "/forms/:formId/submissions/export",
    {
      schema: {
        tags: ["Forms"],
        summary: "Export form submissions as CSV or Excel (Admin)",
        security: [{ cookieAuth: [] }],
        params: FormIdParamSchema,
        querystring: ExportQuerySchema,
      },
      preHandler: [authenticate, checkPermission(FORMS_PERMISSIONS.READ)],
    },
    controller.exportSubmissions.bind(controller),
  );

  // 3. Form Definition (Public — required for website client embeds)
  app.get<{ Params: IdParam }>(
    "/forms/:id",
    {
      schema: {
        tags: ["Forms"],
        summary: "Get form schema by ID or slug (public)",
        params: IdParamSchema,
      },
    },
    controller.getForm.bind(controller),
  );

  // 4. Form Admin CRUD (Protected — forms:read / forms:write)
  app.get<{ Querystring: SearchPaginationQuery }>(
    "/forms",
    {
      schema: {
        tags: ["Forms"],
        summary: "List all forms (Admin)",
        security: [{ cookieAuth: [] }],
        querystring: SearchPaginationQuerySchema,
      },
      preHandler: [authenticate, checkPermission(FORMS_PERMISSIONS.READ)],
    },
    controller.listForms.bind(controller),
  );

  app.post<{ Body: unknown }>(
    "/forms",
    {
      schema: {
        tags: ["Forms"],
        summary: "Create a new form definition (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: CreateFormSchema,
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.createForm.bind(controller),
  );

  app.put<{ Params: IdParam; Body: unknown }>(
    "/forms/:id",
    {
      schema: {
        tags: ["Forms"],
        summary: "Update an existing form definition (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: IdParamSchema,
        body: UpdateFormSchema,
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.updateForm.bind(controller),
  );

  app.delete<{ Params: IdParam }>(
    "/forms/:id",
    {
      schema: {
        tags: ["Forms"],
        summary: "Delete a form definition (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: IdParamSchema,
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(FORMS_PERMISSIONS.WRITE)],
    },
    controller.deleteForm.bind(controller),
  );
}
