import type { ICollection, IDatabase } from "@cms/core";
import crypto from "node:crypto";

export type SessionStatus = "active" | "revoked" | "expired";
export type SessionRevokeReason =
  | "logout"
  | "user_suspended"
  | "password_changed"
  | "admin_revoked"
  | "self_revoked"
  | "expired"
  | "panic_revoke_all";

export interface SessionDoc extends Record<string, unknown> {
  id: string;
  userId: string;
  userAgent?: string | undefined;
  ip?: string | undefined;
  status: SessionStatus;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  refreshCount: number;
  revokedAt?: Date | undefined;
  revokedBy?: string | undefined;
  revokeReason?: SessionRevokeReason | undefined;
}

export class SessionsRepository {
  private readonly collection: ICollection<SessionDoc>;

  constructor(db: IDatabase) {
    this.collection = db.collection<SessionDoc>("cms_sessions");
  }

  async findById(id: string): Promise<SessionDoc | null> {
    return this.collection.findOne({ id });
  }

  async findByUserId(
    userId: string,
    options?: { includeRevoked?: boolean },
  ): Promise<SessionDoc[]> {
    const filter: Record<string, unknown> = { userId };
    if (!options?.includeRevoked) {
      filter["status"] = "active";
    }
    return this.collection.find(filter, { sort: { createdAt: -1 } });
  }

  async findActiveByUserId(userId: string): Promise<SessionDoc[]> {
    return this.findByUserId(userId, { includeRevoked: false });
  }

  async create(data: {
    userId: string;
    expiresAt: Date;
    userAgent?: string | undefined;
    ip?: string | undefined;
  }): Promise<SessionDoc> {
    const now = new Date();
    const doc: SessionDoc = {
      id: crypto.randomUUID(),
      userId: data.userId,
      userAgent: data.userAgent,
      ip: data.ip,
      status: "active",
      createdAt: now,
      lastActiveAt: now,
      expiresAt: data.expiresAt,
      refreshCount: 0,
    };
    await this.collection.insertOne(doc);
    return doc;
  }

  async updateExpiresAt(id: string, expiresAt: Date): Promise<void> {
    await this.collection.updateOne({ id }, { $set: { expiresAt } });
  }

  async updateSlide(id: string, expiresAt: Date): Promise<void> {
    const existing = await this.collection.findOne({ id });
    const refreshCount = ((existing?.refreshCount as number) || 0) + 1;
    await this.collection.updateOne(
      { id },
      {
        $set: {
          expiresAt,
          lastActiveAt: new Date(),
          refreshCount,
        },
      },
    );
  }

  async markExpired(id: string): Promise<void> {
    await this.collection.updateOne(
      { id },
      {
        $set: {
          status: "expired",
          revokedAt: new Date(),
          revokeReason: "expired",
        },
      },
    );
  }

  async revoke(
    id: string,
    revokedBy?: string,
    reason: SessionRevokeReason = "self_revoked",
  ): Promise<void> {
    await this.collection.updateOne(
      { id },
      {
        $set: {
          status: "revoked",
          revokedAt: new Date(),
          revokedBy,
          revokeReason: reason,
        },
      },
    );
  }

  async revokeByUserId(
    userId: string,
    revokedBy?: string,
    reason: SessionRevokeReason = "admin_revoked",
  ): Promise<void> {
    const sessions = await this.findActiveByUserId(userId);
    const now = new Date();
    for (const session of sessions) {
      await this.collection.updateOne(
        { id: session.id },
        {
          $set: {
            status: "revoked",
            revokedAt: now,
            revokedBy,
            revokeReason: reason,
          },
        },
      );
    }
  }

  async revokeAll(
    revokedBy?: string,
    reason: SessionRevokeReason = "panic_revoke_all",
  ): Promise<void> {
    const all = await this.collection.find({});
    const now = new Date();
    for (const s of all) {
      if (s.status !== "revoked" && s.status !== "expired") {
        await this.collection.updateOne(
          { id: s.id },
          {
            $set: {
              status: "revoked",
              revokedAt: now,
              revokedBy,
              revokeReason: reason,
            },
          },
        );
      }
    }
  }

  async delete(id: string): Promise<void> {
    await this.revoke(id, undefined, "self_revoked");
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.revokeByUserId(userId, undefined, "admin_revoked");
  }

  async deleteAll(): Promise<void> {
    await this.revokeAll(undefined, "panic_revoke_all");
  }
}
