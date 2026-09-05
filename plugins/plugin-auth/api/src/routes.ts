import type { FastifyInstance } from "fastify";
import type { AuthController } from "./controllers/AuthController.js";
import type { RoleController } from "./controllers/RoleController.js";
import type { UserController } from "./controllers/UserController.js";
import { registerAuthSessionRoutes, type AuthRouteOptions } from "./routes/authRoutes.js";
import { registerRoleRoutes } from "./routes/roleRoutes.js";
import { registerUserRoutes } from "./routes/userRoutes.js";

export { type AuthRouteOptions } from "./routes/authRoutes.js";

export function registerAuthRoutes(
  app: FastifyInstance,
  controllers:
    | {
        auth: AuthController;
        user: UserController;
        role: RoleController;
      }
    | AuthController,
  options: AuthRouteOptions = {},
): void {
  const authCtrl = "auth" in controllers ? controllers.auth : controllers;
  const userCtrl =
    "user" in controllers ? controllers.user : (controllers as unknown as UserController);
  const roleCtrl =
    "role" in controllers ? controllers.role : (controllers as unknown as RoleController);

  registerAuthSessionRoutes(app, authCtrl, options);
  registerUserRoutes(app, userCtrl, authCtrl);
  registerRoleRoutes(app, roleCtrl);
}
