import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { users, projects, promptLogs, contextKnowledge, type User, type InsertUser, type Project, type PromptLog, type InsertPromptLog, type ContextKnowledge, type InsertContextKnowledge } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  logPrompt(data: InsertPromptLog): Promise<PromptLog>;
  getRecentPromptLogs(limit?: number): Promise<PromptLog[]>;
  getPromptLogsByProject(projectId: string): Promise<PromptLog[]>;
  getUntrainedPromptLogs(limit?: number): Promise<PromptLog[]>;
  markLogsAsTrained(ids: string[]): Promise<void>;
  updatePromptFeedback(id: string, signal: string, correctedIntent?: string): Promise<void>;
  createProject(data: {
    userId: string;
    name: string;
    prompt: string;
    seed: string;
    styleSeed?: string;
    previousGenomesJson?: string;
    font?: string;
    fontUrl?: string;
    themeColor?: string;
    logoUrl?: string;
    genomeJson?: string;
    layoutJson?: string;
    settingsJson?: string;
    productType?: string;
    layoutLocked?: boolean;
  }): Promise<Project>;
  updateProject(id: string, userId: string, data: {
    genomeJson?: string;
    layoutJson?: string;
    settingsJson?: string;
    productType?: string;
    layoutLocked?: boolean;
    styleSeed?: string;
    previousGenomesJson?: string;
  }): Promise<Project | undefined>;
  deleteProject(id: string, userId: string): Promise<void>;
  getContextByHash(promptHash: string): Promise<ContextKnowledge | undefined>;
  getContextByDomain(domain: string): Promise<ContextKnowledge[]>;
  storeContext(data: InsertContextKnowledge): Promise<ContextKnowledge>;
  incrementContextUsage(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .onConflictDoUpdate({ target: users.id, set: { email: insertUser.email } })
      .returning();
    return user;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId));
  }

  async createProject(data: {
    userId: string;
    name: string;
    prompt: string;
    seed: string;
    styleSeed?: string;
    previousGenomesJson?: string;
    font?: string;
    fontUrl?: string;
    themeColor?: string;
    logoUrl?: string;
    genomeJson?: string;
    layoutJson?: string;
    settingsJson?: string;
    productType?: string;
    layoutLocked?: boolean;
  }): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(
    id: string,
    userId: string,
    data: {
      genomeJson?: string;
      layoutJson?: string;
      settingsJson?: string;
      productType?: string;
      layoutLocked?: boolean;
      styleSeed?: string;
      previousGenomesJson?: string;
    },
  ): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set(data)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return updated;
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  async logPrompt(data: InsertPromptLog): Promise<PromptLog> {
    const [log] = await db.insert(promptLogs).values(data).returning();
    return log;
  }

  async getRecentPromptLogs(limit: number = 100): Promise<PromptLog[]> {
    return db.select().from(promptLogs).orderBy(desc(promptLogs.createdAt)).limit(limit);
  }

  async getPromptLogsByProject(projectId: string): Promise<PromptLog[]> {
    return db.select().from(promptLogs).where(eq(promptLogs.projectId, projectId)).orderBy(desc(promptLogs.createdAt));
  }

  async getUntrainedPromptLogs(limit: number = 500): Promise<PromptLog[]> {
    return db.select().from(promptLogs).where(eq(promptLogs.usedForTraining, false)).orderBy(desc(promptLogs.createdAt)).limit(limit);
  }

  async markLogsAsTrained(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    for (const id of ids) {
      await db.update(promptLogs).set({ usedForTraining: true }).where(eq(promptLogs.id, id));
    }
  }

  async updatePromptFeedback(id: string, signal: string, correctedIntent?: string): Promise<void> {
    const data: Partial<PromptLog> = { feedbackSignal: signal };
    if (correctedIntent) data.correctedIntentJson = correctedIntent;
    await db.update(promptLogs).set(data).where(eq(promptLogs.id, id));
  }

  async getContextByHash(promptHash: string): Promise<ContextKnowledge | undefined> {
    const [row] = await db.select().from(contextKnowledge).where(eq(contextKnowledge.promptHash, promptHash));
    return row;
  }

  async getContextByDomain(domain: string): Promise<ContextKnowledge[]> {
    return db.select().from(contextKnowledge).where(eq(contextKnowledge.domain, domain)).orderBy(desc(contextKnowledge.createdAt)).limit(10);
  }

  async storeContext(data: InsertContextKnowledge): Promise<ContextKnowledge> {
    const [row] = await db.insert(contextKnowledge).values(data).returning();
    return row;
  }

  async incrementContextUsage(id: string): Promise<void> {
    await db.update(contextKnowledge).set({ usageCount: sql`${contextKnowledge.usageCount} + 1` }).where(eq(contextKnowledge.id, id));
  }
}

export const storage = new DatabaseStorage();
