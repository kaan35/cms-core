import {
  EVENTS,
  ForbiddenError,
  HookManager,
  NotFoundError,
  UnauthorizedError,
  stubLogger,
} from "@cms/core";
import { createInMemoryDb } from "@cms/db";
import jwt from "jsonwebtoken";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SessionDoc } from "../repositories/sessionsRepository.js";
import { SessionsRepository } from "../repositories/sessionsRepository.js";
import { SessionService } from "../sessionService.js";

describe("Session Lifecycle, Soft-Revocation, and Sliding Audit Suite", () => {
  const JWT_SECRET = "super-secret-audit-jwt-key-32-chars-long";

  describe("SessionsRepository Invariants", () => {
    it("soft-revocation keeps session doc in cms_sessions with status revoked and revokeReason", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);

      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const session = await sessionsRepo.create({
        userId: "user-101",
        expiresAt: futureDate,
        userAgent: "AuditAgent/1.0",
        ip: "192.168.1.1",
      });

      assert.equal(session.status, "active");
      assert.equal(session.refreshCount, 0);

      // Verify stored directly in cms_sessions collection
      const collection = db.collection<SessionDoc>("cms_sessions");
      const inDbBefore = await collection.findOne({ id: session.id });
      assert.ok(inDbBefore);
      assert.equal(inDbBefore.status, "active");

      // Soft-revoke single session
      await sessionsRepo.revoke(session.id, "admin-actor-42", "admin_revoked");

      // Verify session doc is NOT deleted from collection
      const inDbAfter = await collection.findOne({ id: session.id });
      assert.ok(inDbAfter, "Session document must remain in cms_sessions on revocation");
      assert.equal(inDbAfter.status, "revoked");
      assert.equal(inDbAfter.revokeReason, "admin_revoked");
      assert.equal(inDbAfter.revokedBy, "admin-actor-42");
      assert.ok(inDbAfter.revokedAt instanceof Date);

      // findById returns the revoked session doc
      const fetched = await sessionsRepo.findById(session.id);
      assert.ok(fetched);
      assert.equal(fetched.status, "revoked");
      assert.equal(fetched.revokeReason, "admin_revoked");
    });

    it("findByUserId returns only active sessions by default, but returns all when includeRevoked: true", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);

      const exp = new Date(Date.now() + 60 * 60 * 1000);
      const s1 = await sessionsRepo.create({ userId: "user-audit", expiresAt: exp });
      const s2 = await sessionsRepo.create({ userId: "user-audit", expiresAt: exp });
      const s3 = await sessionsRepo.create({ userId: "user-audit", expiresAt: exp });
      const other = await sessionsRepo.create({ userId: "other-user", expiresAt: exp });

      // Revoke s1 with admin_revoked, s2 with user_suspended
      await sessionsRepo.revoke(s1.id, "admin-1", "admin_revoked");
      await sessionsRepo.revoke(s2.id, "system", "user_suspended");

      // Default findByUserId: only active sessions for target user
      const activeSessions = await sessionsRepo.findByUserId("user-audit");
      assert.equal(activeSessions.length, 1);
      assert.equal(activeSessions[0]?.id, s3.id);
      assert.equal(activeSessions[0]?.status, "active");

      // findActiveByUserId helper: only active
      const activeHelper = await sessionsRepo.findActiveByUserId("user-audit");
      assert.equal(activeHelper.length, 1);
      assert.equal(activeHelper[0]?.id, s3.id);

      // includeRevoked: true returns all 3 sessions for target user
      const allSessions = await sessionsRepo.findByUserId("user-audit", { includeRevoked: true });
      assert.equal(allSessions.length, 3);
      const ids = allSessions.map((s) => s.id);
      assert.ok(ids.includes(s1.id));
      assert.ok(ids.includes(s2.id));
      assert.ok(ids.includes(s3.id));

      // User isolation: other-user session not returned in user-audit queries
      assert.ok(!ids.includes(other.id));
    });

    it("markExpired sets status: expired and preserves document in cms_sessions", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);

      const exp = new Date(Date.now() - 1000); // already past
      const session = await sessionsRepo.create({ userId: "user-exp", expiresAt: exp });

      await sessionsRepo.markExpired(session.id);

      const collection = db.collection<SessionDoc>("cms_sessions");
      const inDb = await collection.findOne({ id: session.id });
      assert.ok(inDb, "Expired session document must not be deleted");
      assert.equal(inDb.status, "expired");
      assert.equal(inDb.revokeReason, "expired");
      assert.ok(inDb.revokedAt instanceof Date);

      // Active query excludes expired sessions
      const active = await sessionsRepo.findByUserId("user-exp");
      assert.equal(active.length, 0);

      // Historical query includes expired sessions
      const history = await sessionsRepo.findByUserId("user-exp", { includeRevoked: true });
      assert.equal(history.length, 1);
      assert.equal(history[0]?.status, "expired");
    });

    it("updateSlide updates lastActiveAt, increments refreshCount, and preserves creation time", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);

      const initialExp = new Date(Date.now() + 10000);
      const session = await sessionsRepo.create({ userId: "user-slide", expiresAt: initialExp });
      const initialCreatedAt = session.createdAt;
      const initialLastActiveAt = session.lastActiveAt;
      assert.equal(session.refreshCount, 0);

      // Wait a slight tick to guarantee distinct timestamp
      await new Promise((resolve) => setTimeout(resolve, 5));

      // Slide 1
      const slide1Exp = new Date(Date.now() + 50000);
      await sessionsRepo.updateSlide(session.id, slide1Exp);

      const afterSlide1 = await sessionsRepo.findById(session.id);
      assert.ok(afterSlide1);
      assert.equal(afterSlide1.refreshCount, 1);
      assert.equal(afterSlide1.expiresAt.getTime(), slide1Exp.getTime());
      assert.equal(afterSlide1.createdAt.getTime(), initialCreatedAt.getTime());
      assert.ok(
        afterSlide1.lastActiveAt.getTime() >= initialLastActiveAt.getTime(),
        "lastActiveAt must be updated",
      );

      // Slide 2
      const slide2Exp = new Date(Date.now() + 100000);
      await sessionsRepo.updateSlide(session.id, slide2Exp);

      const afterSlide2 = await sessionsRepo.findById(session.id);
      assert.ok(afterSlide2);
      assert.equal(afterSlide2.refreshCount, 2);
      assert.equal(afterSlide2.expiresAt.getTime(), slide2Exp.getTime());
      assert.equal(afterSlide2.createdAt.getTime(), initialCreatedAt.getTime());
    });
  });

  describe("SessionService Invariants & Adversarial Defense", () => {
    it("validateAndSlideSession fails-closed on revoked session", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);
      const hooks = new HookManager();
      const sessionService = new SessionService(
        sessionsRepo,
        JWT_SECRET,
        stubLogger,
        24,
        15,
        hooks,
      );

      const { token, sessionId } = await sessionService.createSession("user-target", [
        "users:read",
      ]);

      // Session is valid initially
      const authUser = await sessionService.validateAndSlideSession(token);
      assert.equal(authUser.id, "user-target");

      // Soft-revoke session
      await sessionService.revokeSession(sessionId, "admin-1", "admin_revoked");

      // Subsequent validation must fail closed with UnauthorizedError
      await assert.rejects(
        () => sessionService.validateAndSlideSession(token),
        (err: unknown) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.match((err as Error).message, /revoked or expired/i);
          return true;
        },
      );
    });

    it("validateAndSlideSession fails-closed on expired session in DB", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);
      const sessionService = new SessionService(sessionsRepo, JWT_SECRET, stubLogger, 24, 15);

      const { token, sessionId } = await sessionService.createSession("user-exp", ["users:read"]);

      // Mark session as expired in repo
      await sessionsRepo.markExpired(sessionId);

      await assert.rejects(
        () => sessionService.validateAndSlideSession(token),
        (err: unknown) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.match((err as Error).message, /revoked or expired/i);
          return true;
        },
      );
    });

    it("validateAndSlideSession marks session expired when expiresAt <= now and throws UnauthorizedError", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);
      const sessionService = new SessionService(sessionsRepo, JWT_SECRET, stubLogger, 24, 15);

      const { token, sessionId } = await sessionService.createSession("user-time-exp", [
        "users:read",
      ]);

      // Artificially wind back expiresAt to the past
      await sessionsRepo.updateExpiresAt(sessionId, new Date(Date.now() - 5000));

      await assert.rejects(
        () => sessionService.validateAndSlideSession(token),
        (err: unknown) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.match((err as Error).message, /expired/i);
          return true;
        },
      );

      // Verify repo doc status transitioned to expired
      const sessionInDb = await sessionsRepo.findById(sessionId);
      assert.ok(sessionInDb);
      assert.equal(sessionInDb.status, "expired");
      assert.equal(sessionInDb.revokeReason, "expired");
    });

    it("validateAndSlideSession fails-closed on non-existent session doc", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);
      const sessionService = new SessionService(sessionsRepo, JWT_SECRET, stubLogger, 24, 15);

      // Forge a JWT with a valid structure and valid signature, but pointing to non-existent sessionId
      const ghostSessionId = "ghost-session-uuid-999";
      const token = jwt.sign(
        { userId: "ghost-user", sessionId: ghostSessionId, permissions: ["users:read"] },
        JWT_SECRET,
        { algorithm: "HS256", expiresIn: "1h" },
      );

      await assert.rejects(
        () => sessionService.validateAndSlideSession(token),
        (err: unknown) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.match((err as Error).message, /revoked or expired/i);
          return true;
        },
      );
    });

    it("validateAndSlideSession fails-closed on token signed with forged secret", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);
      const sessionService = new SessionService(sessionsRepo, JWT_SECRET, stubLogger, 24, 15);

      const attackerSecret = "attacker-secret-key-that-is-different-32-chars";
      const token = jwt.sign(
        { userId: "victim-user", sessionId: "some-session-id", permissions: ["*"] },
        attackerSecret,
        { algorithm: "HS256", expiresIn: "1h" },
      );

      await assert.rejects(
        () => sessionService.validateAndSlideSession(token),
        (err: unknown) => {
          assert.ok(err instanceof UnauthorizedError);
          assert.match((err as Error).message, /invalid or expired/i);
          return true;
        },
      );
    });

    it("automatically slides session and emits SESSION_REFRESHED when remaining time < slideThreshold", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);
      const hooks = new HookManager();
      // 24 hour TTL, 15 minute slide threshold
      const sessionService = new SessionService(
        sessionsRepo,
        JWT_SECRET,
        stubLogger,
        24,
        15,
        hooks,
      );

      const refreshedEvents: Array<{ event: string; payload: unknown }> = [];
      hooks.on(EVENTS.AUTH.SESSION_REFRESHED, async (payload) => {
        refreshedEvents.push({ event: EVENTS.AUTH.SESSION_REFRESHED, payload });
      });

      const { token, sessionId } = await sessionService.createSession("user-slider", [
        "users:read",
      ]);

      // Set remaining time to 10 minutes (less than 15 min threshold)
      const nearExpiry = new Date(Date.now() + 10 * 60 * 1000);
      await sessionsRepo.updateExpiresAt(sessionId, nearExpiry);

      const authUser = await sessionService.validateAndSlideSession(token);
      assert.equal(authUser.id, "user-slider");

      // Verify slide occurred
      const slidSession = await sessionsRepo.findById(sessionId);
      assert.ok(slidSession);
      assert.equal(slidSession.refreshCount, 1);
      assert.ok(slidSession.expiresAt.getTime() > Date.now() + 23 * 60 * 60 * 1000);

      // Verify hook emitted
      assert.equal(refreshedEvents.length, 1);
      assert.equal((refreshedEvents[0]?.payload as { sessionId: string }).sessionId, sessionId);
      assert.equal((refreshedEvents[0]?.payload as { userId: string }).userId, "user-slider");
    });

    it("does not slide session when remaining time >= slideThreshold", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);
      const sessionService = new SessionService(sessionsRepo, JWT_SECRET, stubLogger, 24, 15);

      const { token, sessionId } = await sessionService.createSession("user-stable", [
        "users:read",
      ]);

      // Session just created: remaining time is ~24 hours >> 15 min threshold
      await sessionService.validateAndSlideSession(token);

      const sessionAfter = await sessionsRepo.findById(sessionId);
      assert.ok(sessionAfter);
      assert.equal(
        sessionAfter.refreshCount,
        0,
        "refreshCount must not increment when slide not triggered",
      );
    });

    it("deleteUserSession enforces ownership and users:write permission boundaries", async () => {
      const db = createInMemoryDb();
      const sessionsRepo = new SessionsRepository(db);
      const sessionService = new SessionService(sessionsRepo, JWT_SECRET, stubLogger, 24, 15);

      const s1 = await sessionService.createSession("user-owner", ["users:read"]);

      // Non-owner without permission cannot delete session -> 403 Forbidden
      await assert.rejects(
        () =>
          sessionService.deleteUserSession(s1.sessionId, {
            id: "user-other",
            permissions: ["users:read"],
          }),
        ForbiddenError,
      );

      // Owner can delete own session -> reason defaults to self_revoked
      await sessionService.deleteUserSession(s1.sessionId, {
        id: "user-owner",
        permissions: ["users:read"],
      });
      const s1Doc = await sessionsRepo.findById(s1.sessionId);
      assert.equal(s1Doc?.status, "revoked");
      assert.equal(s1Doc?.revokeReason, "self_revoked");

      // Admin with users:write can delete other user's session -> reason admin_revoked
      const s2 = await sessionService.createSession("user-owner-2", ["users:read"]);
      await sessionService.deleteUserSession(s2.sessionId, {
        id: "admin-user",
        permissions: ["users:write"],
      });
      const s2Doc = await sessionsRepo.findById(s2.sessionId);
      assert.equal(s2Doc?.status, "revoked");
      assert.equal(s2Doc?.revokeReason, "admin_revoked");
      assert.equal(s2Doc?.revokedBy, "admin-user");

      // Non-existent session throws NotFoundError
      await assert.rejects(
        () =>
          sessionService.deleteUserSession("non-existent-session-id", {
            id: "admin-user",
            permissions: ["*"],
          }),
        NotFoundError,
      );
    });
  });
});
