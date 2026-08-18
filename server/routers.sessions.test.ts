import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  createPracticeSession: vi.fn(),
  getPracticeSession: vi.fn(),
  listPracticeSessions: vi.fn(),
  savePracticeTopic: vi.fn(),
  updatePracticeSession: vi.fn(),
}));

vi.mock("./db", () => db);

import { appRouter } from "./routers";

const user = {
  id: 42,
  openId: "speaker-42",
  name: "Speaker",
  email: "speaker@example.com",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context(authenticated = true) {
  return { user: authenticated ? user : null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
}

describe("sessions procedures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a session for the authenticated user", async () => {
    db.createPracticeSession.mockResolvedValue({ id: 9, userId: user.id, topic: "Should AI replace teachers?" });
    const caller = appRouter.createCaller(context());
    const result = await caller.sessions.create({ sessionType: "jam", topic: "Should AI replace teachers?", category: "Education", difficulty: "Medium", durationSeconds: 60 });
    expect(db.createPracticeSession).toHaveBeenCalledWith(expect.objectContaining({ userId: 42, sessionType: "jam", durationSeconds: 60 }));
    expect(result).toMatchObject({ id: 9, userId: 42 });
  });

  it("lists and fetches only the authenticated user's sessions", async () => {
    db.listPracticeSessions.mockResolvedValue([{ id: 3, userId: user.id }]);
    db.getPracticeSession.mockResolvedValue({ id: 3, userId: user.id });
    const caller = appRouter.createCaller(context());
    await expect(caller.sessions.list()).resolves.toEqual([{ id: 3, userId: 42 }]);
    await expect(caller.sessions.detail({ sessionId: 3 })).resolves.toMatchObject({ id: 3, userId: 42 });
    expect(db.listPracticeSessions).toHaveBeenCalledWith(42);
    expect(db.getPracticeSession).toHaveBeenCalledWith(42, 3);
  });

  it("completes a session with persisted recording and analysis metadata", async () => {
    db.updatePracticeSession.mockResolvedValue({ id: 3, status: "complete", overallScore: 84 });
    const caller = appRouter.createCaller(context());
    const result = await caller.sessions.complete({ sessionId: 3, overallScore: 84, recordingKey: "recordings/42/answer.webm", recordingUrl: "/manus-storage/answer.webm", transcript: "My response", analysisJson: "{}" });
    expect(db.updatePracticeSession).toHaveBeenCalledWith(42, 3, expect.objectContaining({ status: "complete", overallScore: 84, transcript: "My response" }));
    expect(result).toMatchObject({ id: 3, status: "complete" });
  });

  it("rejects unauthenticated session access", async () => {
    const caller = appRouter.createCaller(context(false));
    await expect(caller.sessions.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.sessions.detail({ sessionId: 3 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.sessions.create({ sessionType: "jam", topic: "Should AI replace teachers?", category: "Education", difficulty: "Medium", durationSeconds: 60 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.sessions.complete({ sessionId: 3, overallScore: 80 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
