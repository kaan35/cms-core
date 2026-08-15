import type { ICollection, IDatabase } from "@cms/core";
import { randomUUID } from "node:crypto";

export interface AuditLogDoc extends Record<string, unknown> {
  id: string;
  event: string;
  actorId?: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}

export class AuditLogRepository {
  private readonly collection: ICollection<AuditLogDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<AuditLogDoc>("cms_audit_log");
  }

  async create(entry: {
    event: string;
    actorId?: string;
    data?: Record<string, unknown>;
  }): Promise<AuditLogDoc> {
    const doc: AuditLogDoc = {
      id: randomUUID(),
      event: entry.event,
      ...(entry.actorId ? { actorId: entry.actorId } : {}),
      ...(entry.data ? { data: entry.data } : {}),
      createdAt: new Date(),
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async list(skip = 0, limit = 20): Promise<AuditLogDoc[]> {
    const all = await this.collection.find();
    const sorted = all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted.slice(skip, skip + limit);
  }

  async count(): Promise<number> {
    return this.collection.countDocuments();
  }
}
