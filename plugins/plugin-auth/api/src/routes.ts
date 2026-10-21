import type { FastifyInstance } from "fastify";
import type { ApiTokenController } from "./controllers/ApiTokenController.js";
import type { AuthController } from "./controllers/AuthController.js";
import type { RoleController } from "./controllers/RoleController.js";
import type { UserController } from "./controllers/UserController.js";
import { registerApiTokenRoutes } from "./routes/apiTokenRoutes.js";
import { registerAuthSessionRoutes, type AuthRouteOptions } from "./routes/authRoutes.js";
import { registerRoleRoutes } from "./routes/roleRoutes.js";
import { registerUserRoutes } from "./routes/userRoutes.js";

export { type AuthRouteOptions } from "./routes/authRoutes.js";

export interface AuthControllers {
  auth: AuthController;
  user: UserController;
  role: RoleController;
  apiToken?: ApiTokenController;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  controllers: AuthControllers,
  options: AuthRouteOptions = {},
): void {
  registerAuthSessionRoutes(app, controllers.auth, options);
  registerUserRoutes(app, controllers.user, controllers.auth);
  registerRoleRoutes(app, controllers.role);
  if (controllers.apiToken) {
    registerApiTokenRoutes(app, controllers.apiToken);
  }
}
