import { PERMISSIONS } from "@cms/core";
import type { FastifyInstance } from "fastify";
import type { RoleController } from "../controllers/RoleController.js";

export function registerRoleRoutes(app: FastifyInstance, roleCtrl: RoleController): void {
  const { authenticate, checkPermission, verifyCsrf } = app;

  app.get(
    "/roles",
    {
      schema: {
        tags: ["Auth"],
        summary: "List all roles and permission sets (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.ROLES_READ)],
    },
    roleCtrl.listRoles.bind(roleCtrl),
  );

  app.get(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Get role details by ID (Admin)",
        security: [{ cookieAuth: [] }],
      },
      preHandler: [authenticate, checkPermission(PERMISSIONS.AUTH.ROLES_READ)],
    },
    roleCtrl.getRoleById.bind(roleCtrl),
  );

  app.post(
    "/roles",
    {
      schema: {
        tags: ["Auth"],
        summary: "Create a new RBAC role (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.createRole.bind(roleCtrl),
  );

  app.put(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Update role permissions (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.updateRole.bind(roleCtrl),
  );

  app.delete(
    "/roles/:id",
    {
      schema: {
        tags: ["Auth"],
        summary: "Delete a role (Admin)",
        security: [{ cookieAuth: [] }, { csrfToken: [] }],
      },
      preHandler: [authenticate, verifyCsrf, checkPermission(PERMISSIONS.AUTH.ROLES_WRITE)],
    },
    roleCtrl.deleteRole.bind(roleCtrl),
  );
}
