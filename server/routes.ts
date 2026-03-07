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
import { applyPatchesToGenome } from "@shared/nlParser";
import { parseSettings, maybeApplyIndustryConstraints, detectIndustryFromText } from "@shared/saasConstraints";
import { interpretIntent } from "@shared/intentInterpreter";
import { getProductContext, generateContextualLayout, detectProductTypeFromText } from "@shared/productContextEngine";
import { generateContextContent, buildSemanticContext } from "@shared/contextGraph";
import { mergeDesignSources } from "@shared/designMerger";
import { interpretSemanticMulti } from "@shared/semanticInterpreter";
import { generateMultiPatches } from "@shared/patchGenerator";
import { applyLayoutConstraints, simplifyIfNeeded } from "@shared/layoutConstraints";
import { buildGenomeSig, serializeGenomeSig, isGenomeTooSimilar, hasSufficientMutation, legacySigToNew } from "@shared/layoutSignature";
import { createContextLock, extractContextLock, applyContextLock, enforceContextLock, filterLockedFields } from "@shared/contextLock";
import { extractUniversalContext } from "@shared/universalContext";
import { isCorrectionPrompt, applyContextCorrection } from "@shared/contextOverride";
import { computeLayoutHash, isLayoutTooSimilar, buildLayoutSigComponents } from "@shared/layoutSignature";
import { needsMutation, mutateLayout } from "@shared/layoutMutation";
import { validateContent, needsRegeneration } from "@shared/contextValidator";

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

      const universalCtx = extractUniversalContext(fullText);

      const effectiveIndustry = universalCtx.industry || detectedIndustry;
      const effectiveProductType = universalCtx.productType || intent.productType || undefined;

      const promptContent = generateContextContent(prompt, effectiveProductType ?? null, resolvedBrandName, universalCtx);
      const semanticContext = buildSemanticContext(prompt, effectiveProductType ?? null);

      const initialSettings: Record<string, unknown> = {
        uniqueIcons: effectiveIndustry !== "saas",
        forceStandardGenome: effectiveIndustry === "saas",
        industry: effectiveIndustry,
        tone: "creative" as const,
        productType: effectiveProductType,
        ...(resolvedBrandName ? { brandName: resolvedBrandName } : {}),
        promptContent,
        semanticContext,
      };

      const contextLock = createContextLock(universalCtx);
      applyContextLock(initialSettings, contextLock);
      initialSettings.contextLock = contextLock;

      let genome = generateGenome(seed, { name, prompt, font, themeColor });
      genome = maybeApplyIndustryConstraints(genome, initialSettings as any);
      genome = mergeDesignSources(genome, { selectedFont: font, selectedPrimaryColor: themeColor, uploadedLogoUrl: logoUrl, productType: effectiveProductType });
      const genomeJson = JSON.stringify(genome);

      const resolvedPageType = universalCtx.pageType || (intent.pageType as any) || undefined;
      const isLandingPage = resolvedPageType === "landing_page" || resolvedPageType === "marketing_site";
      let layout = (productContext && !isLandingPage)
        ? generateContextualLayout(seed, productContext, universalCtx)
        : generateLayout(seed, { name, prompt, font, themeColor, pageType: resolvedPageType });

      layout = applyLayoutConstraints(layout, resolvedPageType);
      layout = simplifyIfNeeded(layout, resolvedPageType);

      const layoutSigComponents = buildLayoutSigComponents(layout, genome);
      const layoutHash = computeLayoutHash(layoutSigComponents, seed);
      const previousGenomes: string[] = [];
      if (isLayoutTooSimilar(layoutHash, previousGenomes)) {
        if (needsMutation(layoutSigComponents, [])) {
          layout = mutateLayout(layout, seed + "-mutation");
          layout = applyLayoutConstraints(layout, resolvedPageType);
          layout = simplifyIfNeeded(layout, resolvedPageType);
        }
      }

      const contentValidation = validateContent(promptContent, universalCtx);
      if (needsRegeneration(contentValidation)) {
        const retryContent = generateContextContent(prompt, effectiveProductType ?? null, resolvedBrandName, universalCtx);
        if (!needsRegeneration(validateContent(retryContent, universalCtx))) {
          initialSettings.promptContent = retryContent;
        }
      }

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
      const nlContextLock = extractContextLock(project.settingsJson);

      const intents = interpretSemanticMulti(commands);
      const patchSet = generateMultiPatches(intents);

      if (patchSet.genomePatch.length > 0) {
        currentGenome = applyPatchesToGenome(currentGenome, patchSet.genomePatch);
      }

      for (const [key, value] of Object.entries(patchSet.settingsPatch)) {
        if (nlContextLock.locked && (key === "industry" || key === "productType" || key === "coreActivities" || key === "pageType")) {
          continue;
        }
        (currentSettings as any)[key] = value;
        if (key === "productType" && typeof value === "string") {
          newProductType = value;
        }
      }

      contentPatch = { ...patchSet.contentPatch };

      if (patchSet.description) {
        for (const d of patchSet.description.split("; ")) {
          if (d && !allDescriptions.includes(d)) allDescriptions.push(d);
        }
      }

      const hasProductTypeChange = intents.some(i => i.target === "product.type" && i.value);
      if (hasProductTypeChange && !project.layoutLocked) {
        const intentForLayout = interpretIntent(commands);
        const productContext = getProductContext(intentForLayout);
        if (productContext) {
          currentLayout = generateContextualLayout(project.seed, productContext);
          allDescriptions.push(`Layout switched to ${productContext.label}`);
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

      const totalPatchCount = patchSet.genomePatch.length +
        Object.keys(patchSet.settingsPatch).length +
        Object.keys(patchSet.contentPatch).length;

      res.json({
        project: updated,
        description: allDescriptions,
        patchCount: totalPatchCount,
        intents,
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

      // Normalize any legacy 2-part signatures to the new 6-part format
      const normalizedHistory = previousGenomes.map(s => s.includes("|") ? s : legacySigToNew(s));

      // Get current genome signature to check sufficient mutation
      const currentGenomeParsed = project.genomeJson ? JSON.parse(project.genomeJson) : null;
      const currentSig = currentGenomeParsed
        ? serializeGenomeSig(buildGenomeSig(currentGenomeParsed))
        : null;

      while (attempts < 8) {
        const entropy = `${randomUUID()}-${Date.now()}`;
        newStyleSeed = createHash("sha256").update(`${currentStyleSeed}${entropy}`).digest("hex");
        const candidate = generateGenome(newStyleSeed) as Record<string, unknown>;

        const candidateSig = serializeGenomeSig(buildGenomeSig(candidate as any));

        // Reject if too similar to any of the last 5 designs (match on 4+ of 6 dimensions)
        const tooSimilar = isGenomeTooSimilar(candidateSig, normalizedHistory.slice(-5), 4);
        // Also require at least 2 dimensions changed from current design
        const sufficientChange = !currentSig || hasSufficientMutation(candidateSig, currentSig, 2);

        if (!tooSimilar && sufficientChange) {
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
      const contextLock = extractContextLock(project.settingsJson);

      if (contextLock.locked && contextLock.industry) {
        (currentSettings as any).industry = contextLock.industry;
      }

      newGenome = maybeApplyIndustryConstraints(newGenome as any, currentSettings) as any;

      const effectiveProductType = (contextLock.locked && contextLock.productType)
        ? contextLock.productType
        : (project.productType
          ?? (parseSettings(project.settingsJson) as any).productType
          ?? undefined);

      newGenome = mergeDesignSources(newGenome as any, {
        selectedFont: project.font,
        selectedPrimaryColor: project.themeColor,
        uploadedLogoUrl: project.logoUrl,
        productType: effectiveProductType,
      }) as any;

      const sig = serializeGenomeSig(buildGenomeSig(newGenome as any));
      const updatedHistory = [...normalizedHistory.slice(-4), sig];

      if (currentGenomeJson && currentSig && !updatedHistory.includes(currentSig)) {
        updatedHistory.unshift(currentSig);
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

  app.post("/api/project/:id/correct-context", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const { correction } = req.body;
      if (!correction || typeof correction !== "string") {
        return res.status(400).json({ message: "correction string is required" });
      }

      if (!isCorrectionPrompt(correction)) {
        return res.status(400).json({ message: "Input does not appear to be a context correction. Try something like: 'this is an AI company, not a construction company'" });
      }

      const currentUniversalCtx = extractUniversalContext(project.prompt);
      const correctionResult = applyContextCorrection(currentUniversalCtx, correction, project.prompt);

      if (!correctionResult.corrected) {
        return res.json({ corrected: false, message: "No corrections were applicable", corrections: [] });
      }

      const updatedCtx = correctionResult.updatedContext;
      const newContextLock = createContextLock(updatedCtx);

      const promptContent = generateContextContent(
        project.prompt,
        updatedCtx.productType,
        project.name,
        updatedCtx,
      );

      const currentSettings = parseSettings(project.settingsJson);
      const newSettings: Record<string, unknown> = {
        ...currentSettings,
        industry: updatedCtx.industry,
        productType: updatedCtx.productType ?? currentSettings.productType,
        promptContent,
        contextLock: newContextLock,
      };

      const updated = await storage.updateProject(project.id, userId!, {
        settingsJson: JSON.stringify(newSettings),
        productType: updatedCtx.productType ?? project.productType ?? undefined,
      });

      res.json({
        corrected: true,
        project: updated,
        corrections: correctionResult.corrections,
        newIndustry: updatedCtx.industry,
      });
    } catch (err) {
      console.error("Error correcting context:", err);
      res.status(500).json({ message: "Failed to correct context" });
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
