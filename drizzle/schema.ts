import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const practiceSessions = mysqlTable("practiceSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionType: mysqlEnum("sessionType", ["jam", "gd", "interview", "challenge"]).notNull(),
  topic: varchar("topic", { length: 500 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  difficulty: varchar("difficulty", { length: 16 }).notNull(),
  durationSeconds: int("durationSeconds").notNull().default(60),
  status: mysqlEnum("status", ["draft", "complete", "discarded"]).notNull().default("draft"),
  overallScore: int("overallScore"),
  recordingKey: varchar("recordingKey", { length: 512 }),
  recordingUrl: text("recordingUrl"),
  transcript: text("transcript"),
  analysisJson: text("analysisJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const savedTopics = mysqlTable("savedTopics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topic: varchar("topic", { length: 500 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  difficulty: varchar("difficulty", { length: 16 }).notNull(),
  durationSeconds: int("durationSeconds").notNull().default(60),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = typeof practiceSessions.$inferInsert;
export type SavedTopic = typeof savedTopics.$inferSelect;
