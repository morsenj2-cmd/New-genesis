import type { Express } from "express";
import { createServer, type Server } from "http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { createHash, randomUUID } from "crypto";
import archiver from "archiver";
import { storage } from "./storage";
import { createProjectSchema } from "@shared/schema";
import { generateGenome } from "@shared/genomeGenerator";
import { generateLayout } from "@shared/layoutEngine";
import { uploadBase64Image, uploadBase64Font } from "./cloudinary";
import { generateExportFiles, safeName } from "./exportGenerator";
import { parseNLCommand, applyPatchesToGenome } from "@shared/nlParser";
import { parseSettings, maybeApplyIndustryConstraints, detectIndustryFromText } from "@shared/saasConstraints";
import { interpretIntent } from "@shared/intentInterpreter";
import { getProductContext, generateContextualLayout, detectProductTypeFromText } from "@shared/productContextEngine";
import { generatePromptContent } from "@shared/promptContent";
import { mergeDesignSources } from "@shared/designMerger";
import { interpretSemantic } from "@shared/semanticInterpreter";
import { generatePatches } from "@shared/patchGenerator";

function requireAuth(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function isBase64DataUrl(str: string): boolean {
  return typeof str === "string" && str.startsWith("data:");
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

      let { name, prompt, brandName: explicitBrandName, font, fontUrl, themeColor, logoUrl } = parsed.data;

      const timestamp = Date.now().toString();
      const tempId = `${userId}-${timestamp}`;
      const seed = createHash("sha256").update(`${userId}${tempId}${timestamp}`).digest("hex");

      // Upload logo to Cloudinary if it's a base64 data URL
      if (logoUrl && isBase64DataUrl(logoUrl)) {
        try {
          logoUrl = await uploadBase64Image(logoUrl, `logos/${userId}`, `logo_${seed.slice(0, 12)}`);
        } catch (err) {
          console.error("Logo upload failed:", err);
          return res.status(500).json({ message: "Failed to upload logo" });
        }
      }

      // Upload font to Cloudinary if it's a base64 data URL
      if (fontUrl && isBase64DataUrl(fontUrl)) {
        try {
          fontUrl = await uploadBase64Font(fontUrl, `fonts/${userId}`, `font_${seed.slice(0, 12)}`);
        } catch (err) {
          console.error("Font upload failed:", err);
          return res.status(500).json({ message: "Failed to upload font" });
        }
      }

      const detectedIndustry = detectIndustryFromText(`${name} ${prompt}`);
      const fullText = `${name} ${prompt}`;
      const intent = interpretIntent(fullText);
      const productContext = getProductContext(intent);

      // Determine brand name: explicit input > extracted from prompt > project name
      const extractedProductName = intent.productName;
      const resolvedBrandName = explicitBrandName?.trim() || extractedProductName || null;

      // Generate prompt-derived content (headline, subheadline, CTA)
      const promptContent = generatePromptContent(prompt, intent.productType, resolvedBrandName);

      const initialSettings = {
        uniqueIcons: detectedIndustry !== "saas",
        forceStandardGenome: detectedIndustry === "saas",
        industry: detectedIndustry,
        tone: "creative" as const,
        productType: intent.productType ?? undefined,
        ...(resolvedBrandName ? { brandName: resolvedBrandName } : {}),
        promptContent,
      };

      let genome = generateGenome(seed, { name, prompt, font, themeColor });
      genome = maybeApplyIndustryConstraints(genome, initialSettings);
      genome = mergeDesignSources(genome, { selectedFont: font, selectedPrimaryColor: themeColor, uploadedLogoUrl: logoUrl, productType: intent.productType });
      const genomeJson = JSON.stringify(genome);

      const layout = productContext
        ? generateContextualLayout(seed, productContext)
        : generateLayout(seed, { name, prompt, font, themeColor, pageType: intent.pageType as any ?? undefined });
      const layoutJson = JSON.stringify(layout);
      const settingsJson = JSON.stringify(initialSettings);

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
        layoutJson,
        settingsJson,
        productType: intent.productType ?? undefined,
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

  app.post("/api/project/:id/apply-nl", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const { commands } = req.body;
      if (!commands || typeof commands !== "string") {
        return res.status(400).json({ message: "commands string is required" });
      }

      let currentGenome = project.genomeJson ? JSON.parse(project.genomeJson) : generateGenome(project.seed);
      let currentSettings = parseSettings(project.settingsJson);
      let currentLayout = project.layoutJson ? JSON.parse(project.layoutJson) : generateLayout(project.seed);
      let newProductType: string | undefined = project.productType ?? undefined;
      const allDescriptions: string[] = [];
      let contentPatch: Record<string, string> = {};

      // ── 1. Semantic interpreter pass ─────────────────────────────────────
      const semanticIntent = interpretSemantic(commands);
      if (semanticIntent.intent !== "noop" && semanticIntent.confidence >= 0.6) {
        const patchSet = generatePatches(semanticIntent);

        // Apply genome patches
        if (patchSet.genomePatch.length > 0) {
          currentGenome = applyPatchesToGenome(currentGenome, patchSet.genomePatch);
        }

        // Apply settings patches (brandName, productType etc.)
        for (const [key, value] of Object.entries(patchSet.settingsPatch)) {
          (currentSettings as any)[key] = value;
          if (key === "productType" && typeof value === "string") {
            newProductType = value;
          }
        }

        // Collect content patches (brandName, headline, subheadline, ctaLabel)
        contentPatch = { ...patchSet.contentPatch };

        if (patchSet.description) allDescriptions.push(patchSet.description);

        // Product type → regenerate layout
        if (semanticIntent.target === "product.type" && semanticIntent.value && !project.layoutLocked) {
          const intentForLayout = interpretIntent(commands);
          const productContext = getProductContext(intentForLayout);
          if (productContext) {
            currentLayout = generateContextualLayout(project.seed, productContext);
            allDescriptions.push(`Layout switched to ${productContext.label}`);
          }
        }
      }

      // ── 2. Legacy NL parser pass (style, font, color, radius, spacing etc.) ─
      // Only skip if semantic handler fully handled it with high confidence and
      // the intent is purely brand/name/content — otherwise run legacy too.
      const skipLegacy = semanticIntent.intent === "change_name" && semanticIntent.confidence >= 0.9;
      if (!skipLegacy) {
        const { patches, description, productType, intent } = parseNLCommand(commands);

        const settingsPatches = patches.filter(p => p.path.startsWith("settings."));
        const genomePatches = patches.filter(p => !p.path.startsWith("settings."));

        for (const patch of settingsPatches) {
          const key = patch.path.replace("settings.", "");
          (currentSettings as any)[key] = patch.value;
        }

        if (genomePatches.length > 0) {
          currentGenome = applyPatchesToGenome(currentGenome, genomePatches);
        }

        // Merge non-empty descriptions
        for (const d of description) {
          if (d && !allDescriptions.includes(d)) allDescriptions.push(d);
        }

        if (!project.layoutLocked && productType && semanticIntent.intent !== "set_product_type") {
          const productContext = getProductContext(intent);
          if (productContext) {
            currentLayout = generateContextualLayout(project.seed, productContext);
            (currentSettings as any).productType = productType;
            newProductType = productType;
            allDescriptions.push(`Layout switched to ${productContext.label}`);
          }
        }
      }

      currentGenome = maybeApplyIndustryConstraints(currentGenome, currentSettings);

      currentGenome = mergeDesignSources(currentGenome, {
        selectedFont: project.font,
        selectedPrimaryColor: project.themeColor,
        uploadedLogoUrl: project.logoUrl,
        productType: newProductType,
      });

      const updated = await storage.updateProject(project.id, userId!, {
        genomeJson: JSON.stringify(currentGenome),
        layoutJson: JSON.stringify(currentLayout),
        settingsJson: JSON.stringify(currentSettings),
        productType: newProductType,
      });

      res.json({
        project: updated,
        description: allDescriptions,
        patchCount: (semanticIntent.intent !== "noop" ? 1 : 0),
        semanticIntent,
        contentPatch,
      });
    } catch (err) {
      console.error("Error applying NL command:", err);
      res.status(500).json({ message: "Failed to apply command" });
    }
  });

  app.post("/api/project/:id/regenerate-style", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const previousGenomes: string[] = project.previousGenomesJson
        ? JSON.parse(project.previousGenomesJson)
        : [];

      const currentStyleSeed = project.styleSeed ?? project.seed;
      const currentGenomeJson = project.genomeJson;

      let newStyleSeed = "";
      let newGenome: Record<string, unknown> | null = null;
      let attempts = 0;

      while (attempts < 5) {
        const entropy = `${randomUUID()}-${Date.now()}`;
        newStyleSeed = createHash("sha256").update(`${currentStyleSeed}${entropy}`).digest("hex");
        const candidate = generateGenome(newStyleSeed) as Record<string, unknown>;

        const candidateHue = (candidate.colors as any)?.hues?.primary ?? 0;
        const candidateFont = (candidate.typography as any)?.heading ?? "";
        const candidateSig = `${Math.round(candidateHue / 30) * 30}-${candidateFont}`;

        const isTooSimilar = previousGenomes.slice(-4).some(sig => sig === candidateSig);
        if (!isTooSimilar) {
          newGenome = candidate;
          break;
        }
        attempts++;
      }

      if (!newGenome) {
        const entropy = `${randomUUID()}-${Date.now()}-final`;
        newStyleSeed = createHash("sha256").update(`${currentStyleSeed}${entropy}`).digest("hex");
        newGenome = generateGenome(newStyleSeed) as Record<string, unknown>;
      }

      const currentSettings = parseSettings(project.settingsJson);
      newGenome = maybeApplyIndustryConstraints(newGenome as any, currentSettings) as any;

      const effectiveProductType = project.productType
        ?? (parseSettings(project.settingsJson) as any).productType
        ?? undefined;

      newGenome = mergeDesignSources(newGenome as any, {
        selectedFont: project.font,
        selectedPrimaryColor: project.themeColor,
        uploadedLogoUrl: project.logoUrl,
        productType: effectiveProductType,
      }) as any;

      const genHue = (newGenome.colors as any)?.hues?.primary ?? 0;
      const genFont = (newGenome.typography as any)?.heading ?? "";
      const sig = `${Math.round(genHue / 30) * 30}-${genFont}`;
      const updatedHistory = [...previousGenomes.slice(-4), sig];

      if (currentGenomeJson) {
        const prevHue = (JSON.parse(currentGenomeJson).colors as any)?.hues?.primary ?? 0;
        const prevFont = (JSON.parse(currentGenomeJson).typography as any)?.heading ?? "";
        const prevSig = `${Math.round(prevHue / 30) * 30}-${prevFont}`;
        if (!updatedHistory.includes(prevSig)) {
          updatedHistory.unshift(prevSig);
        }
      }

      const updated = await storage.updateProject(project.id, userId!, {
        genomeJson: JSON.stringify(newGenome),
        styleSeed: newStyleSeed,
        previousGenomesJson: JSON.stringify(updatedHistory.slice(-5)),
      });

      res.json({ project: updated, styleSeed: newStyleSeed, genome: newGenome });
    } catch (err) {
      console.error("Error regenerating style:", err);
      res.status(500).json({ message: "Failed to regenerate style" });
    }
  });

  app.patch("/api/project/:id/layout-lock", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      const { locked } = req.body;
      if (typeof locked !== "boolean") return res.status(400).json({ message: "locked boolean required" });
      const updated = await storage.updateProject(project.id, userId!, { layoutLocked: locked });
      res.json(updated);
    } catch (err) {
      console.error("Error toggling layout lock:", err);
      res.status(500).json({ message: "Failed to toggle layout lock" });
    }
  });

  app.delete("/api/project/:id", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteProject(req.params.id, userId!);
      res.json({ message: "Project deleted" });
    } catch (err) {
      console.error("Error deleting project:", err);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.get("/api/export/project/:id", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const genome = project.genomeJson
        ? JSON.parse(project.genomeJson)
        : generateGenome(project.seed);
      const layout = project.layoutJson
        ? JSON.parse(project.layoutJson)
        : generateLayout(project.seed);

      const files = generateExportFiles(project, genome, layout);
      const folderName = safeName(project.name);

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${folderName}.zip"`);

      const zip = archiver("zip", { zlib: { level: 9 } });
      zip.on("error", (err) => {
        console.error("Archiver error:", err);
        if (!res.headersSent) res.status(500).json({ message: "Export failed" });
      });
      zip.pipe(res);

      for (const file of files) {
        zip.append(file.content, { name: `${folderName}/${file.path}` });
      }

      await zip.finalize();
    } catch (err) {
      console.error("Error exporting project:", err);
      if (!res.headersSent) res.status(500).json({ message: "Export failed" });
    }
  });

  return httpServer;
}
