import bcrypt from "bcrypt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { z } from "zod";


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

  logger.info("🔑 Plugin-Auth: Initializing authentication routes...");

  const usersCol = db.getCollection("cms_users");
  const rolesCol = db.getCollection("cms_roles");

  // Migrate legacy super_admin users and ensure root template exists
  const rootRole = await rolesCol.findOne({ name: "Root" });
  if (!rootRole) {
    await rolesCol.insertOne({
      name: "Root",
      description: "Full system access with all permissions",
      permissions: SYSTEM_PERMISSIONS,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    logger.info("Created missing root role template");
  }

  const legacyUsers = await usersCol
    .find({
      $or: [
        { role: "super_admin" },
        { email: "admin@cms.com", $or: [{ permissions: { $exists: false } }, { permissions: { $size: 0 } }] },
      ],
    })
    .toArray();

  for (const legacyUser of legacyUsers) {
    await usersCol.updateOne(
      { _id: legacyUser._id },
      {
        $set: {
          role: "user",
          permissions: SYSTEM_PERMISSIONS,
          updatedAt: new Date(),
        },
      }
    );
    logger.info(`Migrated legacy user ${legacyUser.email} to permission-based access`);
  }

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
        let objId: ObjectId;
        try {
          objId = new ObjectId(decoded.id);
        } catch {
          reply.status(401).send({ status: "error", message: "Unauthorized: Invalid token" });
          return reply;
        }

        const dbUser = await usersCol.findOne({ _id: objId }, { projection: { passwordHash: 0 } });
        if (!dbUser) {
          reply.status(401).send({ status: "error", message: "Unauthorized: User not found" });
          return reply;
        }

        request.user = {
          id: dbUser._id.toString(),
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

      const user = await usersCol.findOne({ email });

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
          id: user._id.toString(),
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
          id: user._id.toString(),
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
      const usersCol = db.getCollection("cms_users");
      const users = await usersCol.find({}, { projection: { passwordHash: 0 } }).toArray();
      return {
        status: "success",
        users: users.map((u: any) => ({
          id: u._id.toString(),
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
      const usersCol = db.getCollection("cms_users");

      const existing = await usersCol.findOne({ email: body.email });
      if (existing) {
        reply.status(400).send({ status: "error", message: "User already exists" });
        return;
      }

      const passwordHash = await bcrypt.hash(body.password, 10);
      const newUser = {
        email: body.email,
        passwordHash,
        role: "user",
        permissions: body.permissions,
        createdAt: new Date(),
      };

      const result = await usersCol.insertOne(newUser);
      return {
        status: "success",
        user: {
          id: result.insertedId.toString(),
          email: newUser.email,
          role: newUser.role,
          permissions: newUser.permissions,
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
      const usersCol = db.getCollection("cms_users");
      let objId;
      try {
        objId = new ObjectId(id);
      } catch (err) {
        reply.status(400).send({ status: "error", message: "Invalid user ID" });
        return;
      }
      const user = await usersCol.findOne({ _id: objId }, { projection: { passwordHash: 0 } });
      if (!user) {
        reply.status(404).send({ status: "error", message: "User not found" });
        return;
      }
      return {
        status: "success",
        user: {
          id: user._id.toString(),
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
      const usersCol = db.getCollection("cms_users");

      let objId;
      try {
        objId = new ObjectId(id);
      } catch (err) {
        reply.status(400).send({ status: "error", message: "Invalid user ID" });
        return;
      }

      const user = await usersCol.findOne({ _id: objId });
      if (!user) {
        reply.status(404).send({ status: "error", message: "User not found" });
        return;
      }

      await usersCol.updateOne(
        { _id: objId },
        {
          $set: {
            permissions: body.permissions,
            updatedAt: new Date(),
          },
        }
      );

      return {
        status: "success",
        user: {
          id: user._id.toString(),
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
      const usersCol = db.getCollection("cms_users");

      let objId;
      try {
        objId = new ObjectId(id);
      } catch (err) {
        reply.status(400).send({ status: "error", message: "Invalid user ID" });
        return;
      }

      // Check if trying to delete self
      const currentUser = request.user;
      if (currentUser.id === id) {
        reply.status(400).send({ status: "error", message: "Cannot delete your own admin account" });
        return;
      }

      const result = await usersCol.deleteOne({ _id: objId });
      if (result.deletedCount === 0) {
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
      const roles = await rolesCol.find({}).sort({ name: 1 }).toArray();
      return { status: "success", roles };
    }
  );

  // Get role by ID
  fastify.get(
    "/auth/roles/:id",
    { preHandler: [fastify.authenticate, checkPermission("users:read")] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      
      let objectId;
      try {
        objectId = new ObjectId(id);
      } catch (err) {
        reply.status(400).send({ status: "error", message: "Invalid role ID" });
        return;
      }

      const role = await rolesCol.findOne({ _id: objectId });
      if (!role) {
        reply.status(404).send({ status: "error", message: "Role not found" });
        return;
      }

      return { 
        status: "success", 
        role: {
          ...role,
          id: role._id.toString(),
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
      const existing = await rolesCol.findOne({ name: body.name });
      if (existing) {
        reply.status(400).send({ status: "error", message: "Role name already exists" });
        return;
      }
      const role = { ...body, createdAt: new Date(), updatedAt: new Date() };
      const result = await rolesCol.insertOne(role);
      return { status: "success", role: { ...role, id: result.insertedId.toString() } };
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
      let objId: ObjectId;
      try { objId = new ObjectId(id); } catch {
        reply.status(400).send({ status: "error", message: "Invalid role ID" }); return;
      }
      const body = request.body as RoleBody;
      const result = await rolesCol.updateOne(
        { _id: objId },
        { $set: { name: body.name, description: body.description, permissions: body.permissions, updatedAt: new Date() } }
      );
      if (result.matchedCount === 0) {
        reply.status(404).send({ status: "error", message: "Role not found" }); return;
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
      let objId: ObjectId;
      try { objId = new ObjectId(id); } catch {
        reply.status(400).send({ status: "error", message: "Invalid role ID" }); return;
      }
      const result = await rolesCol.deleteOne({ _id: objId });
      if (result.deletedCount === 0) {
        reply.status(404).send({ status: "error", message: "Role not found" }); return;
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
