import net from "node:net";

export const DEFAULT_PORTS = {
  api: 3001,
  admin: 3002,
  client: 3003,
  mongo: 27017,
  redis: 6379,
} as const;

export interface ResolvePortsOptions {
  apiPort?: number | undefined;
  adminPort?: number | undefined;
  clientPort?: number | undefined;
  mongoPort?: number | undefined;
  redisPort?: number | undefined;
  includeAdmin?: boolean | undefined;
  includeClient?: boolean | undefined;
}

export interface ShiftedPortInfo {
  name: string;
  requested: number;
  assigned: number;
  explicit: boolean;
}

export interface ResolvedPorts {
  apiPort: number;
  adminPort?: number | undefined;
  clientPort?: number | undefined;
  mongoPort: number;
  redisPort: number;
  autoShifted: ShiftedPortInfo[];
}

/**
 * Checks whether a TCP port is available on the specified host.
 * Uses native node:net.createServer().
 * Resolves true if the port can be listened on, false otherwise (e.g. EADDRINUSE).
 * Always closes the server before resolving true.
 */
export function isPortAvailable(port: number, host = "0.0.0.0"): Promise<boolean> {
  return new Promise((resolve) => {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      resolve(false);
      return;
    }

    const server = net.createServer();
    server.unref();
    server.maxConnections = 0;
    server.on("connection", (socket) => socket.destroy());

    let finished = false;

    const timer = setTimeout(() => {
      finish(false);
    }, 1000);

    function finish(available: boolean): void {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        try {
          server.close();
        } catch {
          // ignore if already closed
        }
        resolve(available);
      }
    }

    server.once("error", () => {
      finish(false);
    });

    server.listen({ port, host }, () => {
      server.close(() => {
        finish(true);
      });
    });
  });
}

/**
 * Iterates from preferredPort up to preferredPort + maxTries and returns the first available port.
 * Optionally skips ports present in an allocated Set.
 */
export async function findAvailablePort(
  preferredPort: number,
  maxTries = 100,
  allocated?: Set<number>,
): Promise<number> {
  for (let i = 0; i <= maxTries; i++) {
    const port = preferredPort + i;
    if (port > 65535) {
      break;
    }
    if (allocated?.has(port)) {
      continue;
    }
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(
    `No available port found starting from ${preferredPort} (tried ${maxTries} ports).`,
  );
}

/**
 * Resolves project ports with intelligent conflict detection and auto-assignment.
 * Defaults when omitted: API: 3001, Admin: 3002, Client: 3003, Mongo: 27017, Redis: 6379.
 * Avoids port collisions both on the host (via isPortAvailable) and within the batch (tracking allocated Set).
 * Returns resolved ports and an array of any auto-shifted ports with explicit flags.
 */
export async function resolveProjectPorts(
  options: ResolvePortsOptions = {},
): Promise<ResolvedPorts> {
  const allocated = new Set<number>();
  const autoShifted: ShiftedPortInfo[] = [];

  const targets: Array<{
    key: "apiPort" | "adminPort" | "clientPort" | "mongoPort" | "redisPort";
    name: string;
    requested: number;
    explicit: boolean;
  }> = [
    {
      key: "apiPort",
      name: "API",
      requested: options.apiPort ?? DEFAULT_PORTS.api,
      explicit: options.apiPort !== undefined,
    },
  ];

  if (options.includeAdmin !== false) {
    targets.push({
      key: "adminPort",
      name: "Admin",
      requested: options.adminPort ?? DEFAULT_PORTS.admin,
      explicit: options.adminPort !== undefined,
    });
  }

  if (options.includeClient) {
    targets.push({
      key: "clientPort",
      name: "Client",
      requested: options.clientPort ?? DEFAULT_PORTS.client,
      explicit: options.clientPort !== undefined,
    });
  }

  targets.push(
    {
      key: "mongoPort",
      name: "MongoDB",
      requested: options.mongoPort ?? DEFAULT_PORTS.mongo,
      explicit: options.mongoPort !== undefined,
    },
    {
      key: "redisPort",
      name: "Redis",
      requested: options.redisPort ?? DEFAULT_PORTS.redis,
      explicit: options.redisPort !== undefined,
    },
  );

  const resolved: Partial<
    Record<"apiPort" | "adminPort" | "clientPort" | "mongoPort" | "redisPort", number>
  > = {};

  for (const target of targets) {
    if (target.explicit) {
      // User explicitly specified this port.
      // If it collides with another port already allocated in this same project batch, shift it.
      if (allocated.has(target.requested)) {
        const assigned = await findAvailablePort(target.requested + 1, 100, allocated);
        allocated.add(assigned);
        resolved[target.key] = assigned;
        autoShifted.push({
          name: target.name,
          requested: target.requested,
          assigned,
          explicit: true,
        });
      } else {
        // Respect explicit user intent for their .env configuration
        allocated.add(target.requested);
        resolved[target.key] = target.requested;
        const available = await isPortAvailable(target.requested);
        if (!available) {
          autoShifted.push({
            name: target.name,
            requested: target.requested,
            assigned: target.requested,
            explicit: true,
          });
        }
      }
    } else {
      // Port was omitted -> smart auto-assignment to first free available port on host
      const assigned = await findAvailablePort(target.requested, 100, allocated);
      allocated.add(assigned);
      resolved[target.key] = assigned;

      if (assigned !== target.requested) {
        autoShifted.push({
          name: target.name,
          requested: target.requested,
          assigned,
          explicit: false,
        });
      }
    }
  }

  return {
    apiPort: resolved.apiPort!,
    adminPort: options.includeAdmin !== false ? resolved.adminPort : undefined,
    clientPort: options.includeClient ? resolved.clientPort : undefined,
    mongoPort: resolved.mongoPort!,
    redisPort: resolved.redisPort!,
    autoShifted,
  };
}
