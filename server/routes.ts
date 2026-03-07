import type { Express } from "express";
import { createServer, type Server } from "http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { createHash } from "crypto";
import { storage } from "./storage";
import { createProjectSchema } from "@shared/schema";
import { generateGenome } from "@shared/genomeGenerator";

function requireAuth(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/config", (_req, res) => {
    res.json({ publishableKey: process.env.CLERK_PUBLISHABLE_KEY });
  });

  app.use(clerkMiddleware());

  app.post("/api/user/sync", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      const user = await storage.upsertUser({ id: userId!, email });
      res.json(user);
    } catch (err) {
      console.error("Error syncing user:", err);
      res.status(500).json({ message: "Failed to sync user" });
    }
  });

  app.post("/api/project/create", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
      }
      const { name, prompt, font, fontUrl, themeColor, logoUrl } = parsed.data;
      const timestamp = Date.now().toString();
      const tempId = `${userId}-${timestamp}`;
      const seed = createHash("sha256").update(`${userId}${tempId}${timestamp}`).digest("hex");

      const genome = generateGenome(seed, { name, prompt, font, themeColor });
      const genomeJson = JSON.stringify(genome);

      const project = await storage.createProject({
        userId: userId!,
        name,
        prompt,
        seed,
        font,
        fontUrl,
        themeColor,
        logoUrl,
        genomeJson,
      });
      res.status(201).json(project);
    } catch (err) {
      console.error("Error creating project:", err);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get("/api/project/list", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const projectList = await storage.getProjectsByUser(userId!);
      res.json(projectList);
    } catch (err) {
      console.error("Error listing projects:", err);
      res.status(500).json({ message: "Failed to list projects" });
    }
  });

  app.get("/api/project/:id", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      res.json(project);
    } catch (err) {
      console.error("Error fetching project:", err);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  return httpServer;
}
