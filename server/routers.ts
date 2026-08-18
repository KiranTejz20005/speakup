import { COOKIE_NAME } from "@shared/const";
import { difficulties, gdPersonalities, interviewCategories, topicCategories } from "@shared/practice";
import { z } from "zod";
import { createPracticeSession, getPracticeSession, listPracticeSessions, savePracticeTopic, updatePracticeSession } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createDiscussionReply } from "./services/discussion";
import { generateAIFeedback } from "./services/feedback";
import { getInterviewQuestion } from "./services/interview";
import { buildProgressSnapshot } from "./services/progress";
import { getRandomTopic } from "./services/topics";
import { transcribePracticeRecording } from "./services/transcription";
import { storagePut } from "./storage";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  topics: router({
    random: publicProcedure.input(z.object({ category: z.enum(topicCategories).default("Random"), difficulty: z.enum(difficulties).optional(), durationSeconds: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(60) })).query(({ input }) => getRandomTopic(input.category, input.difficulty, input.durationSeconds)),
    save: protectedProcedure.input(z.object({ topic: z.string().min(2).max(500), category: z.enum(topicCategories), difficulty: z.enum(difficulties), durationSeconds: z.number().int().min(15).max(600).default(60) })).mutation(async ({ ctx, input }) => {
      await savePracticeTopic(ctx.user.id, input.topic, input.category, input.difficulty, input.durationSeconds);
      return { success: true };
    }),
  }),
  sessions: router({
    list: protectedProcedure.query(({ ctx }) => listPracticeSessions(ctx.user.id)),
    detail: protectedProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(({ ctx, input }) => getPracticeSession(ctx.user.id, input.sessionId)),
    create: protectedProcedure.input(z.object({ sessionType: z.enum(["jam", "gd", "interview", "challenge"]), topic: z.string().min(2).max(500), category: z.string().min(2).max(64), difficulty: z.string().min(2).max(16), durationSeconds: z.number().int().min(15).max(600).default(60) })).mutation(({ ctx, input }) => createPracticeSession({ ...input, userId: ctx.user.id })),
    complete: protectedProcedure.input(z.object({ sessionId: z.number().int().positive(), overallScore: z.number().int().min(0).max(100).optional(), recordingKey: z.string().max(512).optional(), recordingUrl: z.string().max(1024).optional(), transcript: z.string().max(100000).optional(), analysisJson: z.string().max(120000).optional() })).mutation(({ ctx, input }) => {
      const { sessionId, ...values } = input;
      return updatePracticeSession(ctx.user.id, sessionId, { ...values, status: "complete" });
    }),
  }),
  progress: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => buildProgressSnapshot(await listPracticeSessions(ctx.user.id, 500))),
  }),
  recordings: router({
    upload: protectedProcedure.input(z.object({ base64: z.string().min(8).max(22000000), contentType: z.enum(["audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4"]), fileName: z.string().min(3).max(128) })).mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
      if (bytes.byteLength > 16 * 1024 * 1024) throw new Error("Recordings must be 16MB or smaller for transcription.");
      return storagePut(`recordings/${ctx.user.id}/${Date.now()}-${input.fileName}`, bytes, input.contentType);
    }),
    transcribe: protectedProcedure.input(z.object({ recordingUrl: z.string().min(1).max(1024) })).mutation(({ input }) => transcribePracticeRecording(input.recordingUrl)),
  }),
  feedback: router({
    generate: protectedProcedure.input(z.object({ transcript: z.string().max(100000), topic: z.string().min(2).max(500), durationSeconds: z.number().int().min(1).max(600) })).mutation(({ input }) => generateAIFeedback(input)),
  }),
  discussion: router({
    reply: protectedProcedure.input(z.object({ personality: z.enum(gdPersonalities), topic: z.string().min(2).max(500), userArgument: z.string().min(2).max(8000) })).mutation(({ input }) => createDiscussionReply(input)),
    round: protectedProcedure.input(z.object({ topic: z.string().min(2).max(500), userArgument: z.string().min(2).max(8000) })).mutation(async ({ input }) => {
      const replies = await Promise.all(gdPersonalities.map(async personality => ({ personality, content: await createDiscussionReply({ ...input, personality }) })));
      return replies;
    }),
  }),
  interviews: router({
    question: protectedProcedure.input(z.object({ category: z.enum(interviewCategories), index: z.number().int().min(0) })).query(({ input }) => getInterviewQuestion(input.category, input.index)),
  }),
});

export type AppRouter = typeof appRouter;
