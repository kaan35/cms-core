import type { ICollection, IDatabase } from "@cms/core";
import { createDateSearchFormatters, matchesDateSearch } from "@cms/core";
import { randomUUID } from "node:crypto";

export interface AuditLogDoc extends Record<string, unknown> {
  id: string;
  event: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system";
  tokenId?: string;
  status?: "success" | "access_denied" | "error";
  data?: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditLogFilterOptions {
  actorId?: string | undefined;
  actorType?: "user" | "agent" | "system" | undefined;
  tokenId?: string | undefined;
  status?: "success" | "access_denied" | "error" | undefined;
  toolName?: string | undefined;
  event?: string | undefined;
}

export interface AuditLogSearchContext {
  matchedActorIds?: Set<string> | undefined;
  matchedTokenIds?: Set<string> | undefined;
  timeZone?: string | undefined;
  dateFormatters?: Intl.DateTimeFormat[] | undefined;
}

export function buildDbFilter(filter?: AuditLogFilterOptions): Record<string, unknown> {
  if (!filter) return {};
  const dbFilter: Record<string, unknown> = {};
  const orClauses: Record<string, unknown>[] = [];

  if (filter.actorId) {
    dbFilter["actorId"] = filter.actorId;
  }
  if (filter.actorType) {
    dbFilter["actorType"] = filter.actorType;
  }
  if (filter.event) {
    dbFilter["event"] = filter.event;
  }
  if (filter.status) {
    orClauses.push({
      $or: [{ status: filter.status }, { "data.status": filter.status }],
    });
  }
  if (filter.tokenId) {
    const cleanTokenId = filter.tokenId.replace(/^api-token:/, "");
    orClauses.push({
      $or: [{ tokenId: cleanTokenId }, { tokenId: `api-token:${cleanTokenId}` }],
    });
  }
  if (filter.toolName) {
    orClauses.push({
      $or: [{ "data.toolName": filter.toolName }, { "data.tool": filter.toolName }],
    });
  }

  if (orClauses.length === 0) {
    return dbFilter;
  }

  if (Object.keys(dbFilter).length === 0) {
    return orClauses.length === 1 ? orClauses[0]! : { $and: orClauses };
  }

  const andClauses: Record<string, unknown>[] = [
    ...Object.entries(dbFilter).map(([k, v]) => ({ [k]: v })),
    ...orClauses,
  ];
  return { $and: andClauses };
}

export function matchesAuditFilter(doc: AuditLogDoc, filter?: AuditLogFilterOptions): boolean {
  if (!filter) return true;
  if (filter.actorId && doc.actorId !== filter.actorId) {
    return false;
  }
  if (filter.actorType && doc.actorType !== filter.actorType) {
    return false;
  }
  if (filter.event && doc.event !== filter.event) {
    return false;
  }
  if (filter.status) {
    const docStatus = doc.status ?? (doc.data?.["status"] as string | undefined);
    if (docStatus !== filter.status) {
      return false;
    }
  }
  if (filter.tokenId) {
    const cleanTokenId = filter.tokenId.replace(/^api-token:/, "");
    const prefixed = `api-token:${cleanTokenId}`;
    if (doc.tokenId !== cleanTokenId && doc.tokenId !== prefixed) {
      return false;
    }
  }
  if (filter.toolName) {
    const docTool = (doc.data?.["toolName"] ?? doc.data?.["tool"]) as string | undefined;
    if (docTool !== filter.toolName) {
      return false;
    }
  }
  return true;
}

function matchesAuditSearch(doc: AuditLogDoc, q: string, context?: AuditLogSearchContext): boolean {
  if (doc.event.toLowerCase().includes(q)) return true;
  if (doc.event.toLowerCase().replace(/\./g, ":").includes(q)) return true;

  // MCP tool name and synthesized display formats (mcp:tool_name and mcp.tool_name)
  const toolName = (doc.data?.["toolName"] || doc.data?.["tool"]) as string | undefined;
  if (toolName) {
    const lowerTool = toolName.toLowerCase();
    if (lowerTool.includes(q)) return true;
    if (`mcp:${lowerTool}`.includes(q)) return true;
    if (`mcp.${lowerTool}`.includes(q)) return true;
  }

  // Actor type (e.g. "agent", "user", "system")
  if (doc.actorType && doc.actorType.toLowerCase().includes(q)) return true;

  // Identifiers and tokens
  if (doc.actorId) {
    if (doc.actorId.toLowerCase().includes(q)) return true;
    if (context?.matchedActorIds?.has(doc.actorId)) return true;
  }

  if (doc.tokenId) {
    if (doc.tokenId.toLowerCase().includes(q)) return true;
    const cleanTokenId = doc.tokenId.replace(/^api-token:/, "");
    if (context?.matchedTokenIds?.has(doc.tokenId) || context?.matchedTokenIds?.has(cleanTokenId)) {
      return true;
    }
  }

  // Timestamp and formatted date representations (12h, 24h, ISO, client timezone)
  if (doc.createdAt && matchesDateSearch(doc.createdAt, q, context?.dateFormatters)) {
    return true;
  }

  // Enriched token and user metadata
  if (doc.data?.["tokenName"] && String(doc.data["tokenName"]).toLowerCase().includes(q))
    return true;
  if (doc.data?.["tokenPrefix"] && String(doc.data["tokenPrefix"]).toLowerCase().includes(q))
    return true;
  if (doc.data?.["userEmail"] && String(doc.data["userEmail"]).toLowerCase().includes(q))
    return true;

  // General payload data values
  if (doc.data) {
    for (const val of Object.values(doc.data)) {
      if (typeof val === "string" && val.toLowerCase().includes(q)) return true;
    }
  }

  // Resource partition from event (e.g. "mcp", "blog", "pages", "vault", "auth")
  const resource = doc.event.split(".")[0];
  if (resource && resource.toLowerCase().includes(q)) return true;

  return false;
}

export class AuditLogRepository {
  private readonly collection: ICollection<AuditLogDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<AuditLogDoc>("cms_audit_log");
  }

  async create(entry: {
    event: string;
    actorId?: string;
    actorType?: "user" | "agent" | "system";
    tokenId?: string;
    status?: "success" | "access_denied" | "error";
    data?: Record<string, unknown>;
  }): Promise<AuditLogDoc> {
    const doc: AuditLogDoc = {
      id: randomUUID(),
      event: entry.event,
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      ...(entry.actorType ? { actorType: entry.actorType } : {}),
      ...(entry.tokenId ? { tokenId: entry.tokenId } : {}),
      ...(entry.status ? { status: entry.status } : {}),
      ...(entry.data ? { data: entry.data } : {}),
      createdAt: new Date(),
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async list(
    skip = 0,
    limit = 50,
    search?: string,
    context?: AuditLogSearchContext,
    filter?: AuditLogFilterOptions,
  ): Promise<AuditLogDoc[]> {
    if (!search || !search.trim()) {
      const dbFilter = buildDbFilter(filter);
      const results = await this.collection.find(dbFilter, {
        sort: { createdAt: -1 },
        limit,
        skip,
      });
      const sorted = results.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return sorted.length > limit ? sorted.slice(0, limit) : sorted;
    }

    let all = await this.collection.find();
    if (filter) {
      all = all.filter((doc) => matchesAuditFilter(doc, filter));
    }
    const q = search.trim().toLowerCase();
    const ctxWithFormatters: AuditLogSearchContext = {
      ...context,
      dateFormatters: context?.dateFormatters ?? createDateSearchFormatters(context?.timeZone),
    };
    all = all.filter((doc) => matchesAuditSearch(doc, q, ctxWithFormatters));

    const sorted = all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted.slice(skip, skip + limit);
  }

  async count(
    search?: string,
    context?: AuditLogSearchContext,
    filter?: AuditLogFilterOptions,
  ): Promise<number> {
    if (!search || !search.trim()) {
      const dbFilter = buildDbFilter(filter);
      return this.collection.countDocuments(dbFilter);
    }
    let all = await this.collection.find();
    if (filter) {
      all = all.filter((doc) => matchesAuditFilter(doc, filter));
    }
    const q = search.trim().toLowerCase();
    const ctxWithFormatters: AuditLogSearchContext = {
      ...context,
      dateFormatters: context?.dateFormatters ?? createDateSearchFormatters(context?.timeZone),
    };
    return all.filter((doc) => matchesAuditSearch(doc, q, ctxWithFormatters)).length;
  }
}
