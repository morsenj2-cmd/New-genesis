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
import { isLayoutTooSimilar, buildLayoutSigComponents } from "@shared/layoutSignature";
import { needsMutation, mutateLayout } from "@shared/layoutMutation";
import { validateContent, needsRegeneration } from "@shared/contextValidator";
import { detectMediaIntent, stripMediaPlacements } from "@shared/mediaIntentDetector";
import { routePrompt, routePromptAsync, interpretDesignPrompt } from "../ai/promptRouter";
import { extractProjectContext } from "../ai/context/projectContext";
import { generateProjectSeeds } from "../ai/seed/projectSeeds";
import { generateLayoutDNA } from "../ai/layout/layoutDNA";
import { generateStructuralLayout } from "../ai/layout/structuralGenerator";
import { ensureUniqueDNA } from "../ai/layout/layoutSimilarity";
import { applyStructureEntropy } from "../ai/layout/structureEntropy";
import { buildLogEntry, detectFeedbackSignal, sanitizePrompt } from "../ai/learning/promptLogger";
import { appendExample } from "../ai/learning/learningDataset";
import { recordPrompt, triggerRetrainIfNeeded, getQueueStatus, getTrainingHistory } from "../ai/learning/trainingQueue";
import { recordPattern, getPatternStats, getTopPatterns } from "../ai/learning/patternDiscovery";
import { recordAdaptation, getAdaptationStats } from "../ai/model/adaptation";
import { retrain as retrainModel, getVersionHistory, getCurrentVersion } from "../ai/model/retraining";
import { onRetrain } from "../ai/learning/trainingQueue";
import { loadFromDatabase } from "../ai/learning/learningDataset";
import { classifyInterface, categoryToPageType, categoryIsDashboard } from "../ai/context/interfaceClassifier";
import { extractFullWorkflows } from "../ai/context/workflowExtractor";
import { validateInterfaceLayout, fixLayoutForCategory } from "../ai/context/interfaceValidator";

function requireAuth(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function isBase64DataUrl(str: string): boolean {
  return typeof str === "string" && str.startsWith("data:");
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  onRetrain(async () => {
    console.log("[Learning] Auto-retraining model with accumulated data...");
    retrainModel();
    console.log("[Learning] Retraining complete.");
  });

  try {
    const storedLogs = await storage.getRecentPromptLogs(500);
    if (storedLogs.length > 0) {
      loadFromDatabase(storedLogs.map(l => ({
        sanitizedPrompt: l.sanitizedPrompt,
        intentType: l.intentType,
        confidence: l.confidence,
        feedbackSignal: l.feedbackSignal,
        createdAt: l.createdAt,
      })));
      console.log(`[Learning] Loaded ${storedLogs.length} prompt logs from database`);
    }
  } catch (err) {
    console.error("[Learning] Failed to load stored logs (non-fatal):", err);
  }

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

  app.post("/api/ai/interpret", requireAuth, async (req, res) => {
    try {
      const { prompt, projectId } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "prompt string required" });
      }
      let project: any = undefined;
      if (projectId) {
        project = await storage.getProject(projectId) ?? undefined;
      }
      const result = await routePromptAsync({ prompt, project: project ?? undefined });
      res.json({
        intent: result.intent,
        patchSet: result.patchSet,
        shouldRegenerateLayout: result.shouldRegenerateLayout,
        shouldRegenerateStyle: result.shouldRegenerateStyle,
        shouldCorrectContext: result.shouldCorrectContext,
        brandRename: result.brandRename,
        description: result.description,
        reasoning: result.reasoning ? {
          domain: result.reasoning.context.domain,
          systemType: result.reasoning.context.systemType,
          confidence: result.reasoning.context.confidence,
          entities: result.reasoning.context.entities.slice(0, 10),
          actions: result.reasoning.context.userActions.slice(0, 10),
          suggestedSections: result.reasoning.suggestedSections,
          validationScore: result.reasoning.validationScore,
          graphSummary: result.reasoning.graphSummary,
          augmentationSources: result.reasoning.augmentationSources,
        } : undefined,
      });

      try {
        const { userId } = getAuth(req);
        if (userId && result.intent) {
          const logEntry = buildLogEntry(userId, prompt, result.intent, result.patchSet, projectId);
          const patternId = recordPattern(logEntry.sanitizedPrompt, result.intent.intentType as any);
          logEntry.patternId = patternId;
          await storage.logPrompt(logEntry as any);
          appendExample({
            prompt: logEntry.sanitizedPrompt,
            intentType: result.intent.intentType as any,
            confidence: result.intent.confidence,
            feedbackSignal: "none",
            timestamp: Date.now(),
          });
          recordAdaptation(logEntry.sanitizedPrompt, result.intent.intentType as any);
          recordPrompt();
        }
      } catch (logErr) {
        console.error("Error logging interpret prompt (non-fatal):", logErr);
      }
    } catch (err) {
      console.error("AI interpret error:", err);
      res.status(500).json({ message: "Interpretation failed" });
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

      const classification = classifyInterface(prompt);
      const workflows = extractFullWorkflows(prompt);
      console.log(`[Classifier] category=${classification.category} confidence=${classification.confidence.toFixed(2)} marketing=${classification.isMarketingContent} reasoning=${classification.reasoning}`);

      const classifiedPageType = categoryToPageType(classification.category);
      const classifiedIsDashboard = categoryIsDashboard(classification.category);

      const effectiveIndustry = universalCtx.industry || detectedIndustry;
      const effectiveProductType = universalCtx.productType || intent.productType || undefined;

      const promptContent = generateContextContent(prompt, effectiveProductType ?? null, resolvedBrandName, universalCtx);
      const semanticContext = buildSemanticContext(prompt, effectiveProductType ?? null);

      const mediaAllowed = detectMediaIntent(fullText);

      const initialSettings: Record<string, unknown> = {
        uniqueIcons: effectiveIndustry !== "saas",
        forceStandardGenome: effectiveIndustry === "saas",
        industry: effectiveIndustry,
        tone: "creative" as const,
        productType: effectiveProductType,
        ...(resolvedBrandName ? { brandName: resolvedBrandName } : {}),
        promptContent,
        semanticContext,
        mediaAllowed,
        interfaceCategory: classification.category,
        interfaceConfidence: classification.confidence,
        systemType: classification.system_type,
        primaryUser: classification.primary_user,
        userWorkflows: classification.user_workflows,
        workflowData: workflows,
      };

      const contextLock = createContextLock(universalCtx);
      applyContextLock(initialSettings, contextLock);
      initialSettings.contextLock = contextLock;

      let genome = generateGenome(seed, { name, prompt, font, themeColor });
      genome = maybeApplyIndustryConstraints(genome, initialSettings as any);
      genome = mergeDesignSources(genome, { selectedFont: font, selectedPrimaryColor: themeColor, uploadedLogoUrl: logoUrl, productType: effectiveProductType });
      const genomeJson = JSON.stringify(genome);

      const resolvedPageType = classifiedPageType || universalCtx.pageType || (intent.pageType as any) || undefined;

      const projectSeeds = generateProjectSeeds(seed);
      const isDashboard = classifiedIsDashboard || resolvedPageType === "dashboard" || resolvedPageType === "web_app";
      const dnaContext = {
        pageType: resolvedPageType,
        domain: effectiveIndustry,
        isDashboard,
        productType: effectiveProductType,
        interfaceCategory: classification.category,
      };

      let dna = generateLayoutDNA(projectSeeds.layoutSeed, dnaContext);
      dna = applyStructureEntropy(dna, projectSeeds.componentSeed, dnaContext);
      const uniqueDNA = ensureUniqueDNA(dna);
      dna = uniqueDNA.dna;

      const structuralContext = {
        pageType: resolvedPageType,
        domain: effectiveIndustry,
        isDashboard,
        productType: effectiveProductType,
        componentSeed: projectSeeds.componentSeed,
      };

      let layout = generateStructuralLayout(dna, structuralContext);

      layout = applyLayoutConstraints(layout, resolvedPageType);
      layout = simplifyIfNeeded(layout, resolvedPageType);

      const validation = validateInterfaceLayout(layout, classification.category);
      if (!validation.valid) {
        console.log(`[Validator] Layout invalid for ${classification.category}: missing=[${validation.missingComponents}] unexpected=[${validation.unexpectedComponents}]`);
        layout = fixLayoutForCategory(layout, classification.category);
      }

      const { buildFingerprint } = await import("../ai/layout/diversityGuard");
      const { registerLayout } = await import("../ai/layout/layoutRegistry");
      const fingerprint = buildFingerprint(layout);
      registerLayout(fingerprint);

      if (!mediaAllowed) {
        layout = stripMediaPlacements(layout) as typeof layout;
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

      const aiResult = await routePromptAsync({ prompt: commands, project });

      const intents = interpretSemanticMulti(commands);
      const patchSet = generateMultiPatches(intents);

      if (patchSet.genomePatch.length > 0) {
        currentGenome = applyPatchesToGenome(currentGenome, patchSet.genomePatch);
      }

      for (const aiPatch of aiResult.patchSet.genomePatch) {
        if (!patchSet.genomePatch.find(p => p.path === aiPatch.path)) {
          currentGenome = applyPatchesToGenome(currentGenome, [aiPatch]);
        }
      }

      const mergedSettingsPatch = { ...patchSet.settingsPatch, ...aiResult.patchSet.settingsPatch };
      for (const [key, value] of Object.entries(mergedSettingsPatch)) {
        if (nlContextLock.locked && (key === "industry" || key === "productType" || key === "coreActivities" || key === "pageType")) {
          continue;
        }
        (currentSettings as any)[key] = value;
        if (key === "productType" && typeof value === "string") {
          newProductType = value;
        }
      }

      contentPatch = { ...patchSet.contentPatch, ...aiResult.patchSet.contentPatch };

      if (aiResult.brandRename) {
        contentPatch.brandName = aiResult.brandRename;
        (currentSettings as any).brandName = aiResult.brandRename;
      }

      const descriptionSource = aiResult.description || patchSet.description || "";
      if (descriptionSource) {
        for (const d of descriptionSource.split("; ")) {
          if (d && !allDescriptions.includes(d)) allDescriptions.push(d);
        }
      }

      const hasProductTypeChange = intents.some(i => i.target === "product.type" && i.value);
      if (hasProductTypeChange && !project.layoutLocked) {
        const nlSeed = createHash("sha256")
          .update(`${project.seed}-nl-layout-${Date.now()}-${randomUUID()}`)
          .digest("hex");
        const nlSeeds = generateProjectSeeds(nlSeed);

        const nlClassification = classifyInterface(commands);
        const nlClassifiedPageType = categoryToPageType(nlClassification.category);
        const nlClassifiedIsDash = categoryIsDashboard(nlClassification.category);

        const nlPageType = nlClassifiedPageType || (currentSettings as any)?.pageType || project.productType || undefined;
        const nlIsDashboard = nlClassifiedIsDash || nlPageType === "dashboard" || nlPageType === "web_app";

        const nlDnaContext = {
          pageType: nlPageType as string | undefined,
          domain: (currentSettings as any)?.industry,
          isDashboard: nlIsDashboard,
          productType: newProductType,
          interfaceCategory: nlClassification.category,
        };

        let nlDna = generateLayoutDNA(nlSeeds.layoutSeed, nlDnaContext);
        nlDna = applyStructureEntropy(nlDna, nlSeeds.componentSeed, nlDnaContext);
        const nlUniqueDNA = ensureUniqueDNA(nlDna);
        nlDna = nlUniqueDNA.dna;

        const nlStructCtx = {
          pageType: nlPageType as string | undefined,
          domain: (currentSettings as any)?.industry,
          isDashboard: nlIsDashboard,
          productType: newProductType,
          componentSeed: nlSeeds.componentSeed,
        };

        let nlLayout = generateStructuralLayout(nlDna, nlStructCtx);

        const nlValidation = validateInterfaceLayout(nlLayout, nlClassification.category);
        if (!nlValidation.valid) {
          nlLayout = fixLayoutForCategory(nlLayout, nlClassification.category);
        }

        currentLayout = nlLayout;
        currentLayout = applyLayoutConstraints(currentLayout, nlPageType);
        currentLayout = simplifyIfNeeded(currentLayout, nlPageType);

        allDescriptions.push("Layout architecture regenerated with unique structure");
      }

      const nlMediaRequest = detectMediaIntent(commands);
      const existingMediaAllowed = (currentSettings as any).mediaAllowed === true;
      const effectiveMediaAllowed = existingMediaAllowed || nlMediaRequest;
      if (!effectiveMediaAllowed) {
        currentLayout = stripMediaPlacements(currentLayout) as typeof currentLayout;
      }
      if (nlMediaRequest && !existingMediaAllowed) {
        (currentSettings as any).mediaAllowed = true;
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

      try {
        if (intents.length > 0) {
          const primaryIntent = intents[0];
          const logEntry = buildLogEntry(userId!, prompt, primaryIntent, patchSet, project.id, projectContext);
          const patternId = recordPattern(logEntry.sanitizedPrompt, primaryIntent.intentType as any);
          logEntry.patternId = patternId;
          await storage.logPrompt(logEntry as any);
          appendExample({
            prompt: logEntry.sanitizedPrompt,
            intentType: primaryIntent.intentType as any,
            confidence: primaryIntent.confidence,
            feedbackSignal: "none",
            timestamp: Date.now(),
          });
          recordAdaptation(logEntry.sanitizedPrompt, primaryIntent.intentType as any);
          recordPrompt();
          triggerRetrainIfNeeded().catch(() => {});
        }
      } catch (logErr) {
        console.error("Error logging prompt (non-fatal):", logErr);
      }
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

      let newLayoutJson: string | undefined;
      if (!project.layoutLocked) {
        const regenSeeds = generateProjectSeeds(newStyleSeed);
        const regenPageType = (currentSettings as any)?.pageType || project.productType || undefined;
        const regenIsDashboard = regenPageType === "dashboard" || regenPageType === "web_app";

        const regenDnaCtx = {
          pageType: regenPageType,
          domain: (currentSettings as any)?.industry,
          isDashboard: regenIsDashboard,
          productType: effectiveProductType,
        };

        let regenDna = generateLayoutDNA(regenSeeds.layoutSeed, regenDnaCtx);
        regenDna = applyStructureEntropy(regenDna, regenSeeds.componentSeed, regenDnaCtx);
        const regenUnique = ensureUniqueDNA(regenDna);
        regenDna = regenUnique.dna;

        let regenLayout = generateStructuralLayout(regenDna, {
          ...regenDnaCtx,
          componentSeed: regenSeeds.componentSeed,
        });
        regenLayout = applyLayoutConstraints(regenLayout, regenPageType);
        regenLayout = simplifyIfNeeded(regenLayout, regenPageType);

        const regenMediaAllowed = (currentSettings as any)?.mediaAllowed !== false;
        if (!regenMediaAllowed) {
          regenLayout = stripMediaPlacements(regenLayout) as typeof regenLayout;
        }

        newLayoutJson = JSON.stringify(regenLayout);
      }

      const updated = await storage.updateProject(project.id, userId!, {
        genomeJson: JSON.stringify(newGenome),
        layoutJson: newLayoutJson ?? project.layoutJson,
        styleSeed: newStyleSeed,
        previousGenomesJson: JSON.stringify(updatedHistory.slice(-5)),
      });

      res.json({ project: updated, styleSeed: newStyleSeed, genome: newGenome });
    } catch (err) {
      console.error("Error regenerating style:", err);
      res.status(500).json({ message: "Failed to regenerate style" });
    }
  });

  app.post("/api/project/:id/regenerate-layout", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Forbidden" });
      if (project.layoutLocked) return res.status(400).json({ message: "Layout is locked" });

      const regenSeed = createHash("sha256")
        .update(`${project.seed}-layout-regen-${Date.now()}-${randomUUID()}`)
        .digest("hex");

      const regenSeeds = generateProjectSeeds(regenSeed);
      const currentSettings = parseSettings(project.settingsJson);

      const storedCategory = (currentSettings as any)?.interfaceCategory;
      const regenClassification = storedCategory
        ? { category: storedCategory, isDashboard: categoryIsDashboard(storedCategory) }
        : project.prompt
          ? (() => { const c = classifyInterface(project.prompt); return { category: c.category, isDashboard: categoryIsDashboard(c.category) }; })()
          : { category: undefined, isDashboard: false };

      const regenPageType = (regenClassification.category ? categoryToPageType(regenClassification.category) : undefined)
        || (currentSettings as any)?.pageType || project.productType || undefined;
      const isDashboard = regenClassification.isDashboard || regenPageType === "dashboard" || regenPageType === "web_app";

      const dnaCtx = {
        pageType: regenPageType,
        domain: (currentSettings as any)?.industry,
        isDashboard,
        productType: project.productType ?? undefined,
        interfaceCategory: regenClassification.category,
      };

      let dna = generateLayoutDNA(regenSeeds.layoutSeed, dnaCtx);
      dna = applyStructureEntropy(dna, regenSeeds.componentSeed, dnaCtx);
      const uniqueDNA = ensureUniqueDNA(dna);
      dna = uniqueDNA.dna;

      let layout = generateStructuralLayout(dna, {
        ...dnaCtx,
        componentSeed: regenSeeds.componentSeed,
      });
      layout = applyLayoutConstraints(layout, regenPageType);
      layout = simplifyIfNeeded(layout, regenPageType);

      if (regenClassification.category) {
        const regenValidation = validateInterfaceLayout(layout, regenClassification.category);
        if (!regenValidation.valid) {
          layout = fixLayoutForCategory(layout, regenClassification.category);
        }
      }

      const mediaAllowed = (currentSettings as any)?.mediaAllowed !== false;
      if (!mediaAllowed) {
        layout = stripMediaPlacements(layout) as typeof layout;
      }

      const updated = await storage.updateProject(project.id, userId!, {
        layoutJson: JSON.stringify(layout),
      });

      res.json({
        project: updated,
        layout,
        dnaHash: dna.hash,
        attempts: uniqueDNA.attempts,
      });
    } catch (err) {
      console.error("Error regenerating layout:", err);
      res.status(500).json({ message: "Failed to regenerate layout" });
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

  app.get("/api/ai/learning/stats", requireAuth, async (_req, res) => {
    try {
      const queue = getQueueStatus();
      const patterns = getPatternStats();
      const adaptation = getAdaptationStats();
      const version = getCurrentVersion();
      res.json({
        queue,
        patterns,
        adaptation,
        modelVersion: version ? { id: version.id, trainingSize: version.trainingSize, timestamp: version.timestamp } : null,
        versionHistory: getVersionHistory(),
        trainingHistory: getTrainingHistory(),
      });
    } catch (err) {
      console.error("Error fetching learning stats:", err);
      res.status(500).json({ message: "Failed to fetch learning stats" });
    }
  });

  app.get("/api/ai/learning/patterns", requireAuth, async (_req, res) => {
    try {
      const top = getTopPatterns(50);
      res.json({ patterns: top });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch patterns" });
    }
  });

  app.post("/api/ai/learning/feedback", requireAuth, async (req, res) => {
    try {
      const { logId, signal, correctedIntent } = req.body;
      if (!logId || !signal) return res.status(400).json({ message: "logId and signal required" });
      await storage.updatePromptFeedback(logId, signal, correctedIntent ? JSON.stringify(correctedIntent) : undefined);

      if (correctedIntent && correctedIntent.intentType) {
        appendExample({
          prompt: correctedIntent.prompt ?? "",
          intentType: correctedIntent.intentType,
          confidence: 1.0,
          feedbackSignal: signal,
          timestamp: Date.now(),
        });
        recordAdaptation(correctedIntent.prompt ?? "", correctedIntent.intentType, signal === "positive" ? 1.2 : 0.5);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error updating feedback:", err);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  app.post("/api/ai/learning/retrain", requireAuth, async (_req, res) => {
    try {
      const weights = retrainModel();
      const version = getCurrentVersion();
      res.json({
        success: true,
        version: version ? { id: version.id, trainingSize: version.trainingSize } : null,
      });
    } catch (err) {
      console.error("Error retraining model:", err);
      res.status(500).json({ message: "Failed to retrain model" });
    }
  });

  app.get("/api/ai/learning/logs", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getRecentPromptLogs(limit);
      res.json({ logs });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  app.get("/api/ai/learning/history", requireAuth, async (_req, res) => {
    try {
      const { getHistoryStats, getRecentHistory } = await import("../ai/learning/promptHistory");
      const stats = getHistoryStats();
      const recent = getRecentHistory(20);
      res.json({
        stats,
        recentEntries: recent.map(e => ({
          prompt: e.prompt.slice(0, 100),
          domain: e.interpretedContext.domain,
          validationScore: e.validationScore,
          sourcesUsed: e.internetSources.length,
          timestamp: e.timestamp,
        })),
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  app.get("/api/ai/context/lookup", requireAuth, async (req, res) => {
    try {
      const domain = req.query.domain as string;
      if (!domain) return res.status(400).json({ message: "domain query parameter required" });
      const { lookupDomainContexts } = await import("../ai/knowledge/contextDatabase");
      const contexts = await lookupDomainContexts(domain);
      res.json({
        domain,
        count: contexts.length,
        contexts: contexts.map(c => ({
          promptHash: c.promptHash,
          domain: c.domain,
          validationScore: c.validationScore,
          interfacePatterns: c.generatedInterfacePatterns,
        })),
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to lookup contexts" });
    }
  });

  return httpServer;
}
