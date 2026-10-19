import type { ICollection, IDatabase } from "@cms/core";
import { createDateSearchFormatters, matchesDateSearch } from "@cms/core";
import { randomUUID } from "node:crypto";

export interface AuditLogDoc extends Record<string, unknown> {
  id: string;
  event: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system";
  tokenId?: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}

export interface AuditLogSearchContext {
  matchedActorIds?: Set<string> | undefined;
  matchedTokenIds?: Set<string> | undefined;
  timeZone?: string | undefined;
  dateFormatters?: Intl.DateTimeFormat[] | undefined;
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
    data?: Record<string, unknown>;
  }): Promise<AuditLogDoc> {
    const doc: AuditLogDoc = {
      id: randomUUID(),
      event: entry.event,
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      ...(entry.actorType ? { actorType: entry.actorType } : {}),
      ...(entry.tokenId ? { tokenId: entry.tokenId } : {}),
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
  ): Promise<AuditLogDoc[]> {
    let all = await this.collection.find();
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      const ctxWithFormatters: AuditLogSearchContext = {
        ...context,
        dateFormatters: context?.dateFormatters ?? createDateSearchFormatters(context?.timeZone),
      };
      all = all.filter((doc) => matchesAuditSearch(doc, q, ctxWithFormatters));
    }
    const sorted = all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted.slice(skip, skip + limit);
  }

  async count(search?: string, context?: AuditLogSearchContext): Promise<number> {
    if (!search || !search.trim()) {
      return this.collection.countDocuments();
    }
    const q = search.trim().toLowerCase();
    const ctxWithFormatters: AuditLogSearchContext = {
      ...context,
      dateFormatters: context?.dateFormatters ?? createDateSearchFormatters(context?.timeZone),
    };
    const all = await this.collection.find();
    return all.filter((doc) => matchesAuditSearch(doc, q, ctxWithFormatters)).length;
  }
}
