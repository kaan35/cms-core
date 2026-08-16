import "fastify";

export interface AuthUser {
  id: string;
  email: string;
  permissions: string[];
  sessionId: string;
  name?: string | undefined;
  role?: string | undefined;
  roles?: string[] | undefined;
  roleIds?: string[] | undefined;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    checkPermission: (
      permission: string,
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyCsrf: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: AuthUser;
  }
}
