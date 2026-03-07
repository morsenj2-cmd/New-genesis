import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
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
  font: text("font"),
  fontUrl: text("font_url"),
  themeColor: text("theme_color"),
  logoUrl: text("logo_url"),
  genomeJson: text("genome_json"),
  layoutJson: text("layout_json"),
  settingsJson: text("settings_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  seed: true,
  createdAt: true,
});
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100),
  prompt: z.string().min(1, "Prompt is required").max(2000),
  font: z.string().optional(),
  fontUrl: z.string().optional(),
  themeColor: z.string().optional(),
  logoUrl: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
