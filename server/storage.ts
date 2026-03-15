import { eq, and, desc, sql, or } from "drizzle-orm";
import { db } from "./db";
import { users, projects, promptLogs, contextKnowledge, blogPosts, payments, projectCollaborators, type User, type InsertUser, type Project, type PromptLog, type InsertPromptLog, type ContextKnowledge, type InsertContextKnowledge, type BlogPost, type InsertBlogPost, type Payment, type ProjectCollaborator } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  upgradeUserPlan(id: string, plan: string, expiresAt: Date, creditsToAdd: number): Promise<User | undefined>;
  getUserSubscriptionStatus(id: string): Promise<{ plan: string; active: boolean; totalCredits: number; creditsUsed: number; creditsRemaining: number } | undefined>;
  deductUserCredits(userId: string, amount: number): Promise<{ creditsUsed: number; totalCredits: number } | null>;
  getUserCreditsRemaining(userId: string): Promise<number>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  logPrompt(data: InsertPromptLog): Promise<PromptLog>;
  getRecentPromptLogs(limit?: number): Promise<PromptLog[]>;
  getPromptLogsByProject(projectId: string): Promise<PromptLog[]>;
  getUntrainedPromptLogs(limit?: number): Promise<PromptLog[]>;
  markLogsAsTrained(ids: string[]): Promise<void>;
  updatePromptFeedback(id: string, signal: string, correctedIntent?: string): Promise<void>;
  getPaymentByRazorpayId(razorpayPaymentId: string): Promise<Payment | undefined>;
  recordPayment(userId: string, razorpayPaymentId: string, razorpayOrderId: string, amount: number, currency: string): Promise<Payment>;
  getBlogPosts(): Promise<BlogPost[]>;
  createBlogPost(data: InsertBlogPost): Promise<BlogPost>;
  deleteBlogPost(id: string): Promise<void>;
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
    nlCreditsUsed?: number;
  }): Promise<Project | undefined>;
  deleteProject(id: string, userId: string): Promise<void>;
  getContextByHash(promptHash: string): Promise<ContextKnowledge | undefined>;
  getContextByDomain(domain: string): Promise<ContextKnowledge[]>;
  storeContext(data: InsertContextKnowledge): Promise<ContextKnowledge>;
  incrementContextUsage(id: string): Promise<void>;
  addCollaborator(projectId: string, userId: string, email: string, role: string, invitedBy: string): Promise<ProjectCollaborator>;
  removeCollaborator(projectId: string, userId: string): Promise<void>;
  getCollaborators(projectId: string): Promise<ProjectCollaborator[]>;
  getCollaboratorRole(projectId: string, userId: string): Promise<string | null>;
  updateCollaboratorRole(projectId: string, userId: string, role: string): Promise<ProjectCollaborator | undefined>;
  getSharedProjects(userId: string): Promise<(Project & { collaboratorRole: string })[]>;
  getCollaboratorCount(projectId: string): Promise<number>;
  getUserByEmail(email: string): Promise<User | undefined>;
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

  async upgradeUserPlan(id: string, plan: string, expiresAt: Date, creditsToAdd: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        plan,
        planExpiresAt: expiresAt,
        totalCredits: sql`${users.totalCredits} + ${creditsToAdd}`,
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deductUserCredits(userId: string, amount: number): Promise<{ creditsUsed: number; totalCredits: number } | null> {
    const safeAmount = Math.max(1, Math.ceil(amount));
    const [result] = await db
      .update(users)
      .set({ creditsUsed: sql`LEAST(${users.creditsUsed} + ${safeAmount}, ${users.totalCredits})` })
      .where(
        and(
          eq(users.id, userId),
          sql`${users.creditsUsed} < ${users.totalCredits}`
        )
      )
      .returning({ creditsUsed: users.creditsUsed, totalCredits: users.totalCredits });
    return result || null;
  }

  async getUserCreditsRemaining(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;
    return Math.max(0, user.totalCredits - user.creditsUsed);
  }

  async getUserSubscriptionStatus(id: string): Promise<{ plan: string; active: boolean; totalCredits: number; creditsUsed: number; creditsRemaining: number } | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    const isPremiumActive = user.plan === "morse_black" && user.planExpiresAt ? user.planExpiresAt > new Date() : false;
    const isActive = isPremiumActive || user.plan === "free";
    const effectivePlan = isPremiumActive ? "morse_black" : "free";
    const creditsRemaining = Math.max(0, user.totalCredits - user.creditsUsed);
    return {
      plan: effectivePlan,
      active: isActive,
      totalCredits: user.totalCredits,
      creditsUsed: user.creditsUsed,
      creditsRemaining,
    };
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
      nlCreditsUsed?: number;
    },
  ): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set(data)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return updated;
  }

  async incrementNlCredits(id: string, userId: string, limit: number, amount: number = 1): Promise<number | null> {
    return null;
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

  async getPaymentByRazorpayId(razorpayPaymentId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.razorpayPaymentId, razorpayPaymentId));
    return payment;
  }

  async recordPayment(userId: string, razorpayPaymentId: string, razorpayOrderId: string, amount: number, currency: string): Promise<Payment> {
    const [payment] = await db.insert(payments).values({
      userId,
      razorpayPaymentId,
      razorpayOrderId,
      amount,
      currency,
      status: "captured",
    }).returning();
    return payment;
  }

  async getBlogPosts(): Promise<BlogPost[]> {
    return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async createBlogPost(data: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(data).returning();
    return post;
  }

  async deleteBlogPost(id: string): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async addCollaborator(projectId: string, userId: string, email: string, role: string, invitedBy: string): Promise<ProjectCollaborator> {
    const [collab] = await db.insert(projectCollaborators).values({
      projectId,
      userId,
      email,
      role,
      invitedBy,
    }).returning();
    return collab;
  }

  async removeCollaborator(projectId: string, userId: string): Promise<void> {
    await db.delete(projectCollaborators).where(
      and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId))
    );
  }

  async getCollaborators(projectId: string): Promise<ProjectCollaborator[]> {
    return db.select().from(projectCollaborators).where(eq(projectCollaborators.projectId, projectId));
  }

  async getCollaboratorRole(projectId: string, userId: string): Promise<string | null> {
    const [collab] = await db.select().from(projectCollaborators).where(
      and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId))
    );
    return collab?.role ?? null;
  }

  async updateCollaboratorRole(projectId: string, userId: string, role: string): Promise<ProjectCollaborator | undefined> {
    const [updated] = await db.update(projectCollaborators)
      .set({ role })
      .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.userId, userId)))
      .returning();
    return updated;
  }

  async getSharedProjects(userId: string): Promise<(Project & { collaboratorRole: string })[]> {
    const collabs = await db.select().from(projectCollaborators).where(eq(projectCollaborators.userId, userId));
    if (collabs.length === 0) return [];
    const results: (Project & { collaboratorRole: string })[] = [];
    for (const c of collabs) {
      const [project] = await db.select().from(projects).where(eq(projects.id, c.projectId));
      if (project) results.push({ ...project, collaboratorRole: c.role });
    }
    return results;
  }

  async getCollaboratorCount(projectId: string): Promise<number> {
    const collabs = await db.select().from(projectCollaborators).where(eq(projectCollaborators.projectId, projectId));
    return collabs.length;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
}

export const storage = new DatabaseStorage();
