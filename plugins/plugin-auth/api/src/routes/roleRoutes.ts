import { PERMISSIONS } from "@cms/core";
import type { FastifyInstance } from "fastify";
import type { RoleController } from "../controllers/RoleController.js";
import {
  AuthIdParamSchema,
  CreateRoleSchema,
  OkResponseSchema,
  RoleListResponseSchema,
  RoleSingleResponseSchema,
  RolesQuerySchema,
  UpdateRoleSchema,
  type AuthIdParam,
  type CreateRoleInput,
  type RolesQuery,
  type UpdateRoleInput,
} from "../domain/auth.rules.js";

export function registerRoleRoutes(app: FastifyInstance, roleCtrl: RoleController): void {
  const { authenticate, checkPermission, verifyCsrf } = app;

  app.get<{ Querystring: RolesQuery }>(
    "/roles",
    {
      schema: {
        tags: ["Auth"],
        summary: "List all roles and permission sets (Admin)",
        security: [{ cookieAuth: [] }],
        querystring: RolesQuerySchema,
        response: { 200: RoleListResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.ROLES_READ)],
    },
    roleCtrl.listRoles.bind(roleCtrl),
  );

  app.get<{ Params: AuthIdParam }>(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get role details by ID (Admin)",
        security: [{ cookieAuth: [] }],
        params: AuthIdParamSchema,
        response: { 200: RoleSingleResponseSchema },
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.ROLES_READ)],
    },
    roleCtrl.getRoleById.bind(roleCtrl),
  );

  app.post<{ Body: CreateRoleInput }>(
    "/roles",
    {
      schema: {
        tags: ["Auth"],
        summary: "Create a new RBAC role (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        body: CreateRoleSchema,
        response: { 201: RoleSingleResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.createRole.bind(roleCtrl),
  );

  app.put<{ Params: AuthIdParam; Body: UpdateRoleInput }>(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Update role permissions (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: AuthIdParamSchema,
        body: UpdateRoleSchema,
        response: { 200: RoleSingleResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.updateRole.bind(roleCtrl),
  );

  app.delete<{ Params: AuthIdParam }>(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Delete a role (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
        params: AuthIdParamSchema,
        response: { 200: OkResponseSchema },
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.deleteRole.bind(roleCtrl),
  );
}
