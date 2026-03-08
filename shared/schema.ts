import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  seed: text("seed").notNull(),
  styleSeed: text("style_seed"),
  previousGenomesJson: text("previous_genomes_json"),
  font: text("font"),
  fontUrl: text("font_url"),
  themeColor: text("theme_color"),
  logoUrl: text("logo_url"),
  genomeJson: text("genome_json"),
  layoutJson: text("layout_json"),
  settingsJson: text("settings_json"),
  productType: text("product_type"),
  layoutLocked: boolean("layout_locked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promptLogs = pgTable("prompt_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  promptText: text("prompt_text").notNull(),
  sanitizedPrompt: text("sanitized_prompt").notNull(),
  intentType: text("intent_type").notNull(),
  confidence: real("confidence").notNull(),
  intentJson: text("intent_json").notNull(),
  patchesJson: text("patches_json"),
  projectContextJson: text("project_context_json"),
  feedbackSignal: text("feedback_signal").default("none"),
  correctedIntentJson: text("corrected_intent_json"),
  patternId: text("pattern_id"),
  usedForTraining: boolean("used_for_training").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contextKnowledge = pgTable("context_knowledge", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptHash: text("prompt_hash").notNull(),
  domain: text("domain").notNull(),
  interpretedContext: text("interpreted_context").notNull(),
  retrievedSources: text("retrieved_sources").notNull(),
  generatedInterfacePatterns: text("generated_interface_patterns").notNull(),
  internetContext: text("internet_context"),
  validationScore: real("validation_score"),
  usageCount: integer("usage_count").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContextKnowledgeSchema = createInsertSchema(contextKnowledge).omit({
  id: true,
  createdAt: true,
});
export type InsertContextKnowledge = z.infer<typeof insertContextKnowledgeSchema>;
export type ContextKnowledge = typeof contextKnowledge.$inferSelect;

export const insertPromptLogSchema = createInsertSchema(promptLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertPromptLog = z.infer<typeof insertPromptLogSchema>;
export type PromptLog = typeof promptLogs.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  seed: true,
  createdAt: true,
});
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  prompt: z.string().min(1, "Prompt is required").max(2000),
  brandName: z.string().max(60).optional(),
  font: z.string().optional(),
  fontUrl: z.string().optional(),
  themeColor: z.string().optional(),
  logoUrl: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
