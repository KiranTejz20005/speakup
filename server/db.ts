import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertPracticeSession, InsertUser, practiceSessions, savedTopics, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createPracticeSession(session: InsertPracticeSession) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.insert(practiceSessions).values(session);
  const id = Number(result[0].insertId);
  return getPracticeSession(session.userId, id);
}

export async function getPracticeSession(userId: number, sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(practiceSessions).where(and(eq(practiceSessions.userId, userId), eq(practiceSessions.id, sessionId))).limit(1);
  return result[0];
}

export async function listPracticeSessions(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId)).orderBy(desc(practiceSessions.createdAt)).limit(limit);
}

export async function updatePracticeSession(userId: number, sessionId: number, values: Partial<Omit<InsertPracticeSession, "id" | "userId" | "createdAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(practiceSessions).set({ ...values, updatedAt: new Date() }).where(and(eq(practiceSessions.userId, userId), eq(practiceSessions.id, sessionId)));
  return getPracticeSession(userId, sessionId);
}

export async function savePracticeTopic(userId: number, topic: string, category: string, difficulty: string, durationSeconds = 60) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(savedTopics).values({ userId, topic, category, difficulty, durationSeconds });
}
