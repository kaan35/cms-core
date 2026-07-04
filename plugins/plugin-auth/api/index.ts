import bcrypt from "bcrypt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { RolesRepository } from "./RolesRepository.ts";
import { UsersRepository } from "./UsersRepository.ts";

// Zod login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Zod User Creation Schema
const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  permissions: z.array(z.string()),
});

// Zod User Update Schema
const userUpdateSchema = z.object({
  permissions: z.array(z.string()),
});

// Zod Role Schema (shared for create + update)
const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()),
});

type LoginBody = z.infer<typeof loginSchema>;
type UserCreateBody = z.infer<typeof userCreateSchema>;
type UserUpdateBody = z.infer<typeof userUpdateSchema>;
type RoleBody = z.infer<typeof roleSchema>;

export const name = "@cms/plugin-auth-api";
export const version = "1.0.0";

const SYSTEM_PERMISSIONS = [
  "pages:read", "pages:write", "pages:delete",
  "blog:read", "blog:write", "blog:delete",
  "forms:read", "forms:write", "forms:delete",
  "users:read", "users:write", "users:delete",
  "settings:read", "settings:write",
  "webhooks:read", "webhooks:write", "webhooks:delete",
  "backups:read", "backups:write"
];

export async function register(fastify: FastifyInstance, _options: Record<string, unknown> = {}) {
  const db = fastify.db;
  const config = fastify.config;
  const logger = fastify.logger;

  logger.info("🔑 Plugin-Auth: Initializing authentication routes using Repository pattern...");

  const usersRepo = new UsersRepository(db, logger);
  const rolesRepo = new RolesRepository(db, logger);

  // Decorate root Fastify instance so other plugins can use authenticate as preHandler.
  if (!fastify.hasDecorator("authenticate")) {
    fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token = request.cookies.token;
        if (!token) {
          reply.status(401).send({ status: "error", message: "Unauthorized: No token provided" });
          return reply;
        }

        const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
        const dbUser = await usersRepo.findById(decoded.id);
        if (!dbUser) {
          reply.status(401).send({ status: "error", message: "Unauthorized: User not found" });
          return reply;
        }

        request.user = {
          id: dbUser._id ? dbUser._id.toString() : "",
          email: dbUser.email,
          role: dbUser.role,
          permissions: dbUser.permissions || [],
        };
      } catch (err) {
        reply.status(401).send({ status: "error", message: "Unauthorized: Invalid token" });
        return reply;
      }
    });
  }

  // Permission-based access check factory — decorates Fastify so all plugins can use it.
  if (!fastify.hasDecorator("checkPermission")) {
    fastify.decorate("checkPermission", (permission: string) => {
      return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = request.user;
        if (!user) {
          reply.status(401).send({ status: "error", message: "Unauthorized" });
          return reply;
        }
        if (Array.isArray(user.permissions) && user.permissions.includes(permission)) return;
        reply
          .status(403)
          .send({ status: "error", message: `Forbidden: Missing permission '${permission}'` });
        return reply;
      };
    });
  }

  const checkPermission = fastify.checkPermission;

  // Login Endpoint
  fastify.post(
    "/auth/login",
    {
      schema: {
        body: loginSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as z.infer<typeof loginSchema>;

      const user = await usersRepo.findByEmail(email);

      if (!user) {
        reply.status(401).send({ status: "error", message: "Invalid email or password" });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        reply.status(401).send({ status: "error", message: "Invalid email or password" });
        return;
      }

      // Sign token
      const token = jwt.sign(
        {
          id: user._id ? user._id.toString() : "",
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
        },
        config.JWT_SECRET,
        { expiresIn: "1d" }
      );

      // Set cookie
      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 1 day
      });

      return {
        status: "success",
        user: {
          id: user._id ? user._id.toString() : "",
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
        },
      };
    }
  );

  // Logout Endpoint
  fastify.post("/auth/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie("token", { path: "/" });
    return { status: "success", message: "Logged out successfully" };
  });

  // Me Endpoint
  fastify.get(
    "/auth/me",
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest) => {
      const user = request.user;
      return {
        status: "success",
        user,
      };
    }
  );

  // Get All Permissions List
  fastify.get(
    "/auth/permissions",
    {
      preHandler: [fastify.authenticate],
    },
    async () => {
      return { status: "success", permissions: SYSTEM_PERMISSIONS };
    }
  );

  // Get All Users (Admin Only)
  fastify.get(
    "/auth/users",
    {
      preHandler: [fastify.authenticate, checkPermission("users:read")],
    },
    async () => {
      const users = await usersRepo.findAll();
      return {
        status: "success",
        users: users.map((u: any) => ({
          id: u._id ? u._id.toString() : "",
          email: u.email,
          role: u.role,
          permissions: u.permissions || [],
        })),
      };
    }
  );

  // Create User (Admin Only)
  fastify.post(
    "/auth/users",
    {
      preHandler: [fastify.authenticate, checkPermission("users:write")],
      schema: {
        body: userCreateSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof userCreateSchema>;

      const existing = await usersRepo.findByEmail(body.email);
      if (existing) {
        reply.status(400).send({ status: "error", message: "User already exists" });
        return;
      }

      const passwordHash = await bcrypt.hash(body.password, 10);
      const createdUser = await usersRepo.create({
        email: body.email,
        passwordHash,
        role: "user",
        permissions: body.permissions,
      });

      return {
        status: "success",
        user: {
          id: createdUser._id ? createdUser._id.toString() : "",
          email: createdUser.email,
          role: createdUser.role,
          permissions: createdUser.permissions,
        },
      };
    }
  );

  // Get Single User (Admin Only)
  fastify.get(
    "/auth/users/:id",
    {
      preHandler: [fastify.authenticate, checkPermission("users:read")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const user = await usersRepo.findById(id);
      if (!user) {
        reply.status(404).send({ status: "error", message: "User not found" });
        return;
      }
      return {
        status: "success",
        user: {
          id: user._id ? user._id.toString() : "",
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
        },
      };
    }
  );

  // Update User (Admin Only)
  fastify.put(
    "/auth/users/:id",
    {
      preHandler: [fastify.authenticate, checkPermission("users:write")],
      schema: {
        body: userUpdateSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as z.infer<typeof userUpdateSchema>;

      const user = await usersRepo.findById(id);
      if (!user) {
        reply.status(404).send({ status: "error", message: "User not found" });
        return;
      }

      await usersRepo.updatePermissions(id, body.permissions);

      return {
        status: "success",
        user: {
          id: user._id ? user._id.toString() : "",
          email: user.email,
          role: user.role,
          permissions: body.permissions,
        },
      };
    }
  );

  // Delete User (Admin Only)
  fastify.delete(
    "/auth/users/:id",
    {
      preHandler: [fastify.authenticate, checkPermission("users:delete")],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      // Check if trying to delete self
      const currentUser = request.user;
      if (currentUser && currentUser.id === id) {
        reply.status(400).send({ status: "error", message: "Cannot delete your own admin account" });
        return;
      }

      const deleted = await usersRepo.delete(id);
      if (!deleted) {
        reply.status(404).send({ status: "error", message: "User not found" });
        return;
      }

      return { status: "success", message: "User deleted successfully" };
    }
  );

  // --- ROLE TEMPLATES ---

  // List all roles
  fastify.get(
    "/auth/roles",
    { preHandler: [fastify.authenticate, checkPermission("users:read")] },
    async () => {
      const roles = await rolesRepo.findAll();
      return { status: "success", roles };
    }
  );

  // Get role by ID
  fastify.get(
    "/auth/roles/:id",
    { preHandler: [fastify.authenticate, checkPermission("users:read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      
      const role = await rolesRepo.findById(id);
      if (!role) {
        reply.status(404).send({ status: "error", message: "Role not found" });
        return;
      }

      return { 
        status: "success", 
        role: {
          ...role,
          id: role._id ? role._id.toString() : "",
        }
      };
    }
  );

  // Create role
  fastify.post(
    "/auth/roles",
    {
      preHandler: [fastify.authenticate, checkPermission("users:write")],
      schema: { body: roleSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as RoleBody;
      const existing = await rolesRepo.findByName(body.name);
      if (existing) {
        reply.status(400).send({ status: "error", message: "Role name already exists" });
        return;
      }
      
      const createdRole = await rolesRepo.create(body);
      return { status: "success", role: { ...createdRole, id: createdRole._id ? createdRole._id.toString() : "" } };
    }
  );

  // Update role
  fastify.put(
    "/auth/roles/:id",
    {
      preHandler: [fastify.authenticate, checkPermission("users:write")],
      schema: { body: roleSchema },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = request.body as RoleBody;

      const updated = await rolesRepo.update(id, body.name, body.description, body.permissions);
      if (!updated) {
        reply.status(404).send({ status: "error", message: "Role not found" });
        return;
      }
      return { status: "success", message: "Role updated" };
    }
  );

  // Delete role
  fastify.delete(
    "/auth/roles/:id",
    { preHandler: [fastify.authenticate, checkPermission("users:delete")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const deleted = await rolesRepo.delete(id);
      if (!deleted) {
        reply.status(404).send({ status: "error", message: "Role not found" });
        return;
      }
      return { status: "success", message: "Role deleted" };
    }
  );
}

export default {
  name,
  version,
  register: fp(register, { name }),
};
