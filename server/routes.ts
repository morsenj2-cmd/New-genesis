import type { Express } from "express";
import { createServer, type Server } from "http";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { Resend } from "resend";
import { createHash, randomUUID, createHmac } from "crypto";
import archiver from "archiver";
import Razorpay from "razorpay";
import { storage } from "./storage";
import { createProjectSchema, insertBlogPostSchema } from "@shared/schema";
import { generateGenome, type DesignGenome } from "@shared/genomeGenerator";
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
import { improveLayout } from "../ai/layout/layoutImprover";
import {
  geminiInterpret,
  geminiGenerateApp,
  geminiEditApp,
  geminiGenerateBackend,
  isGeminiAvailable,
  type Integration,
} from "./gemini";
import { broadcastToRoom } from "./websocket";

function requireAuth(req: any, res: any, next: any) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function isBase64DataUrl(str: string): boolean {
  return typeof str === "string" && str.startsWith("data:");
}

function isActivePremium(user: { plan: string; planExpiresAt: Date | null }): boolean {
  if (user.plan !== "morse_black") return false;
  if (!user.planExpiresAt) return false;
  return user.planExpiresAt > new Date();
}

type ProjectAccess = { allowed: true; project: any; role: "owner" | "editor" | "viewer"; ownerId: string } | { allowed: false; status: number; message: string };

async function checkProjectAccess(projectId: string, userId: string): Promise<ProjectAccess> {
  const project = await storage.getProject(projectId);
  if (!project) return { allowed: false, status: 404, message: "Project not found" };
  if (project.userId === userId) return { allowed: true, project, role: "owner", ownerId: project.userId };
  const collabRole = await storage.getCollaboratorRole(projectId, userId);
  if (collabRole) {
    console.log(`[Collab] Access granted (by userId): userId=${userId}, projectId=${projectId}, role=${collabRole}`);
    return { allowed: true, project, role: collabRole as "editor" | "viewer", ownerId: project.userId };
  }

  const currentUser = await storage.getUser(userId);
  if (currentUser?.email) {
    const emailMatch = await storage.getCollaboratorRoleByEmail(projectId, currentUser.email);
    if (emailMatch) {
      try {
        const existingById = await storage.getCollaboratorRole(projectId, userId);
        if (!existingById) {
          await storage.fixCollaboratorUserId(emailMatch.id, userId);
        }
      } catch (e) {
        console.error("[Collab] Failed to fix stale collaborator record:", e);
      }
      console.log(`[Collab] Access granted (by email fallback): userId=${userId}, email=${currentUser.email}, projectId=${projectId}, role=${emailMatch.role}`);
      return { allowed: true, project, role: emailMatch.role as "editor" | "viewer", ownerId: project.userId };
    }
  }

  console.log(`[Collab] Access denied: userId=${userId}, email=${currentUser?.email}, projectId=${projectId}, ownerId=${project.userId}`);
  return { allowed: false, status: 403, message: "Forbidden" };
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendCollaborationInviteEmail(
  toEmail: string,
  projectName: string,
  projectId: string,
  role: string,
  inviterEmail: string,
) {
  if (!resend) {
    console.log(`[Collab] Resend not configured, skipping invite email to ${toEmail}`);
    return;
  }
  const projectUrl = `https://morse.co.in/project/${projectId}`;
  await resend.emails.send({
    from: "Morse <noreply@morse.co.in>",
    to: toEmail,
    subject: `You've been invited to collaborate on "${projectName}" — Morse`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #fff; background: #111; padding: 16px 24px; border-radius: 12px; display: inline-block;">Morse</h1>
        </div>
        <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">You've been invited to collaborate</h2>
          <p style="color: #666; margin: 0 0 24px; font-size: 15px;"><strong>${inviterEmail}</strong> has invited you as a <strong style="text-transform: capitalize;">${role}</strong> on the project <strong>"${projectName}"</strong>.</p>
          <a href="${projectUrl}" style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Open Project</a>
          <p style="color: #999; font-size: 13px; margin: 24px 0 0;">If you don't have a Morse account yet, sign up at <a href="https://morse.co.in" style="color: #666;">morse.co.in</a> with this email address first.</p>
        </div>
        <p style="text-align: center; color: #bbb; font-size: 12px; margin-top: 24px;">&copy; Morse. All rights reserved.</p>
      </div>
    `,
  });
  console.log(`[Collab] Invite email sent to ${toEmail} for project "${projectName}"`);
}

async function sendSubscriptionExpiryReminder(toEmail: string) {
  if (!resend) {
    console.log(`[Subscription] Resend not configured, skipping expiry reminder to ${toEmail}`);
    return;
  }
  await resend.emails.send({
    from: "Morse <noreply@morse.co.in>",
    to: toEmail,
    subject: "Your Morse Black subscription expires tomorrow",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #fff; background: #111; padding: 16px 24px; border-radius: 12px; display: inline-block;">Morse</h1>
        </div>
        <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">Your Morse Black subscription is ending</h2>
          <p style="color: #666; margin: 0 0 16px; font-size: 15px;">Your Morse Black subscription will expire <strong>tomorrow</strong>. After expiry, you'll lose access to premium features including:</p>
          <ul style="color: #666; font-size: 14px; margin: 0 0 24px; padding-left: 20px; line-height: 1.8;">
            <li>Real-time collaboration</li>
            <li>Project export</li>
            <li>Premium AI credits</li>
            <li>Unlimited project creation</li>
          </ul>
          <p style="color: #666; margin: 0 0 24px; font-size: 15px;">Renew now to keep all your premium features and avoid any disruption.</p>
          <a href="https://morse.co.in/dashboard" style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Renew Subscription</a>
          <p style="color: #999; font-size: 13px; margin: 24px 0 0;">Your existing projects and data will remain safe. You'll just be on the free tier until you renew.</p>
        </div>
        <p style="text-align: center; color: #bbb; font-size: 12px; margin-top: 24px;">&copy; Morse. All rights reserved.</p>
      </div>
    `,
  });
  console.log(`[Subscription] Expiry reminder sent to ${toEmail}`);
}

async function sendSubscriptionExpiredEmail(toEmail: string) {
  if (!resend) {
    console.log(`[Subscription] Resend not configured, skipping expired notification to ${toEmail}`);
    return;
  }
  await resend.emails.send({
    from: "Morse <noreply@morse.co.in>",
    to: toEmail,
    subject: "Your Morse Black subscription has expired",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #fff; background: #111; padding: 16px 24px; border-radius: 12px; display: inline-block;">Morse</h1>
        </div>
        <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 12px; padding: 32px;">
          <h2 style="margin: 0 0 8px; font-size: 20px; color: #111;">Your Morse Black subscription has expired</h2>
          <p style="color: #666; margin: 0 0 16px; font-size: 15px;">Your account has been moved back to the <strong>Free</strong> tier. You can continue using Morse with free features, but premium features are no longer available.</p>
          <p style="color: #666; margin: 0 0 24px; font-size: 15px;">Renew anytime to get your premium features back instantly.</p>
          <a href="https://morse.co.in/dashboard" style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Renew Now</a>
        </div>
        <p style="text-align: center; color: #bbb; font-size: 12px; margin-top: 24px;">&copy; Morse. All rights reserved.</p>
      </div>
    `,
  });
  console.log(`[Subscription] Expired notification sent to ${toEmail}`);
}

async function runSubscriptionLifecycleCheck() {
  try {
    const expiringUsers = await storage.getUsersWithExpiringSubscriptions(24);
    for (const user of expiringUsers) {
      if (user.email) {
        sendSubscriptionExpiryReminder(user.email).catch((err) => {
          console.error(`[Subscription] Failed to send reminder to ${user.email}:`, err);
        });
      }
    }
    if (expiringUsers.length > 0) {
      console.log(`[Subscription] Sent ${expiringUsers.length} expiry reminder(s)`);
    }

    const expiredUsers = await storage.getExpiredPremiumUsers();
    for (const user of expiredUsers) {
      await storage.downgradeUserToFree(user.id);
      console.log(`[Subscription] Downgraded user ${user.id} (${user.email}) to free tier`);
      if (user.email) {
        sendSubscriptionExpiredEmail(user.email).catch((err) => {
          console.error(`[Subscription] Failed to send expired notification to ${user.email}:`, err);
        });
      }
    }
    if (expiredUsers.length > 0) {
      console.log(`[Subscription] Downgraded ${expiredUsers.length} expired subscription(s)`);
    }
  } catch (err) {
    console.error("[Subscription] Lifecycle check failed:", err);
  }
}

const MAX_COLLABORATORS = 6;

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  onRetrain(async () => {
    console.log("[Learning] Auto-retraining model with accumulated data...");
    retrainModel();
    console.log("[Learning] Retraining complete.");
  });

  runSubscriptionLifecycleCheck();
  setInterval(runSubscriptionLifecycleCheck, 60 * 60 * 1000);
  console.log("[Subscription] Lifecycle check scheduler started (runs every hour)");

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

      const existingUser = await storage.getUser(userId!);
      const syncEmail = existingUser?.email || email;

      const user = await storage.upsertUser({ id: userId!, email: syncEmail });

      try {
        await storage.linkPendingCollaborators(userId!, syncEmail);
      } catch (err) {
        console.error("[Collab] Failed to link pending collaborators:", err);
      }

      res.json(user);
    } catch (err) {
      console.error("Error syncing user:", err);
      res.status(500).json({ message: "Failed to sync user" });
    }
  });

  const MORSE_BLACK_PRICE = 12900;
  const MORSE_BLACK_CREDITS = 4000;
  const TOKENS_PER_CREDIT = 1000;

  const razorpayInstance = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    : null;

  app.get("/api/user/subscription", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const status = await storage.getUserSubscriptionStatus(userId!);
      if (!status) return res.status(404).json({ message: "User not found" });
      res.json(status);
    } catch (err) {
      console.error("Error fetching subscription:", err);
      res.status(500).json({ message: "Failed to fetch subscription status" });
    }
  });

  app.post("/api/payment/create-order", requireAuth, async (req, res) => {
    try {
      if (!razorpayInstance) return res.status(503).json({ message: "Payment system unavailable" });
      const { userId } = getAuth(req);
      const order = await razorpayInstance.orders.create({
        amount: MORSE_BLACK_PRICE,
        currency: "INR",
        receipt: `mb_${(userId || "u").slice(0, 10)}_${Date.now().toString(36)}`,
        notes: { userId: userId!, plan: "morse_black" },
      });
      res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
      console.error("Error creating order:", err);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  app.post("/api/payment/verify", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      console.log(`[Payment] Verify request from user ${userId}`);
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        console.error("[Payment] Missing fields:", { razorpay_order_id: !!razorpay_order_id, razorpay_payment_id: !!razorpay_payment_id, razorpay_signature: !!razorpay_signature });
        return res.status(400).json({ message: "Missing payment verification fields" });
      }

      const expectedSig = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expectedSig !== razorpay_signature) {
        console.error("[Payment] Signature mismatch");
        return res.status(400).json({ message: "Payment verification failed" });
      }

      const existingPayment = await storage.getPaymentByRazorpayId(razorpay_payment_id);
      if (existingPayment) {
        console.log("[Payment] Already processed, returning success");
        const user = await storage.getUser(userId!);
        return res.json({ success: true, plan: user?.plan || "morse_black", alreadyProcessed: true });
      }

      if (razorpayInstance) {
        try {
          const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);
          console.log(`[Payment] Razorpay status: ${payment.status}, amount: ${payment.amount}, currency: ${payment.currency}`);
          const validStatuses = ["captured", "authorized"];
          if (!validStatuses.includes(payment.status) || Number(payment.amount) !== MORSE_BLACK_PRICE || payment.currency !== "INR") {
            console.error(`[Payment] Invalid state: status=${payment.status}, amount=${payment.amount}, currency=${payment.currency}`);
            return res.status(400).json({ message: "Payment verification failed: invalid payment state" });
          }
          if (payment.order_id !== razorpay_order_id) {
            console.error(`[Payment] Order mismatch: expected=${razorpay_order_id}, got=${payment.order_id}`);
            return res.status(400).json({ message: "Payment verification failed: order mismatch" });
          }
        } catch (fetchErr) {
          console.error("[Payment] Failed to fetch payment from Razorpay:", fetchErr);
          console.log("[Payment] Proceeding with signature-only verification");
        }
      }

      let existingUser = await storage.getUser(userId!);
      if (!existingUser) {
        console.log("[Payment] User not found, creating user record");
        existingUser = await storage.upsertUser({ id: userId!, email: "" });
      }

      await storage.recordPayment(userId!, razorpay_payment_id, razorpay_order_id, MORSE_BLACK_PRICE, "INR");
      console.log(`[Payment] Payment recorded for user ${userId}`);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const user = await storage.upgradeUserPlan(userId!, "morse_black", expiresAt, MORSE_BLACK_CREDITS);
      if (!user) {
        console.error(`[Payment] upgradeUserPlan returned null for ${userId}`);
        return res.status(404).json({ message: "User not found after payment - please contact support" });
      }
      console.log(`[Payment] User ${userId} upgraded to morse_black, total credits: ${user.totalCredits}, expires ${expiresAt.toISOString()}`);
      res.json({ success: true, plan: "morse_black", expiresAt: expiresAt.toISOString(), totalCredits: user.totalCredits, creditsRemaining: user.totalCredits - user.creditsUsed });
    } catch (err) {
      console.error("[Payment] Error verifying payment:", err);
      res.status(500).json({ message: "Payment verification failed" });
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

      const user = await storage.getUser(userId!);
      if (user) {
        const remaining = await storage.getUserCreditsRemaining(userId!);
        if (remaining <= 0) {
          return res.status(403).json({
            message: "You've used all your credits. Upgrade to Morse Black to get more credits.",
            requiresUpgrade: true,
            creditsRemaining: 0,
          });
        }
      }

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
        mediaAllowed,
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

      const improved = improveLayout(layout, {
        pageType: resolvedPageType,
        mediaAllowed,
      });
      layout = improved.layout;
      if (improved.improvements.length > 0) {
        console.log(`[Improver] ${improved.improvements.join("; ")} (score: ${improved.score.total}/10)`);
      }

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

      // Mark gemini as pending if API key is available
      if (isGeminiAvailable()) {
        (initialSettings as any).geminiStatus = "pending";
      }

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

      // Fire off AI pipeline async — doesn't block the response
      if (isGeminiAvailable()) {
        const resolvedFontUrl = fontUrl ?? null;
        const brandNameForAI = resolvedBrandName ?? name;
        const genomeCopy = JSON.parse(genomeJson);

        (async () => {
          try {
            console.log(`[Groq] Starting pipeline for project ${project.id}`);
            const interpret = await geminiInterpret(prompt, name);
            if (!interpret) throw new Error("Interpret returned null");

            const appResult = await geminiGenerateApp(
              prompt,
              name,
              brandNameForAI,
              genomeCopy,
              interpret,
              resolvedFontUrl,
              logoUrl ?? null,
            );
            if (!appResult) throw new Error("App generation returned null");

            const serverJs = await geminiGenerateBackend(prompt, name, interpret);

            const currentProject = await storage.getProject(project.id);
            if (!currentProject) return;

            const settings = parseSettings(currentProject.settingsJson);
            (settings as any).geminiStatus = "ready";
            (settings as any).geminiAppHtml = appResult.html;
            (settings as any).geminiInterpret = interpret;
            if (serverJs) (settings as any).geminiServerJs = serverJs;

            await storage.updateProject(project.id, project.userId, {
              settingsJson: JSON.stringify(settings),
            });
            console.log(`[Groq] Pipeline complete for project ${project.id}`);
          } catch (err) {
            console.error(`[Gemini] Pipeline failed for project ${project.id}:`, err);
            try {
              const currentProject = await storage.getProject(project.id);
              if (currentProject) {
                const settings = parseSettings(currentProject.settingsJson);
                (settings as any).geminiStatus = "failed";
                await storage.updateProject(project.id, project.userId, {
                  settingsJson: JSON.stringify(settings),
                });
                broadcastToRoom(project.id, {
                  type: "project-updated",
                  userId: project.userId,
                  source: "create-ai-failed",
                  timestamp: Date.now(),
                });
              }
            } catch {}
          }
        })();
      }

      res.status(201).json(project);
    } catch (err) {
      console.error("Error creating project:", err);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // On-demand AI app generation (or regeneration) for an existing project
  app.post("/api/project/:id/generate-app", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      if (access.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit" });
      const project = access.project;

      if (!isGeminiAvailable()) {
        return res.status(503).json({ message: "AI API not configured" });
      }

      const genome = project.genomeJson ? JSON.parse(project.genomeJson) : null;
      if (!genome) return res.status(400).json({ message: "Project has no genome" });

      const brandName = (() => {
        try { return (parseSettings(project.settingsJson) as any).brandName ?? project.name; } catch { return project.name; }
      })();

      const settings = parseSettings(project.settingsJson);
      (settings as any).geminiStatus = "pending";
      await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(settings) });
      broadcastToRoom(req.params.id, {
        type: "project-updated",
        userId,
        source: "generate-app-pending",
        timestamp: Date.now(),
      }, userId!);

      res.json({ status: "pending", message: "AI generation started" });

      // Run async after responding
      (async () => {
        try {
          const interpret = await geminiInterpret(project.prompt, project.name);
          if (!interpret) throw new Error("Interpret returned null");

          const genSettings = parseSettings(project.settingsJson);
          const integrations: Integration[] = (genSettings as any).integrations ?? [];

          const appResult = await geminiGenerateApp(
            project.prompt,
            project.name,
            brandName,
            genome,
            interpret,
            project.fontUrl,
            project.logoUrl,
            null,
            integrations,
          );
          if (!appResult) throw new Error("App generation returned null");

          const serverJs = await geminiGenerateBackend(project.prompt, project.name, interpret);

          const latestProject = await storage.getProject(project.id);
          if (!latestProject) return;
          const latestSettings = parseSettings(latestProject.settingsJson);
          (latestSettings as any).geminiStatus = "ready";
          (latestSettings as any).geminiAppHtml = appResult.html;
          (latestSettings as any).geminiInterpret = interpret;
          if (serverJs) (latestSettings as any).geminiServerJs = serverJs;

          await storage.updateProject(project.id, project.userId, {
            settingsJson: JSON.stringify(latestSettings),
          });
          broadcastToRoom(project.id, {
            type: "project-updated",
            userId: project.userId,
            source: "generate-app",
            timestamp: Date.now(),
          });
          console.log(`[Groq] Regeneration complete for project ${project.id}`);
        } catch (err) {
          console.error(`[Groq] Regeneration failed for project ${project.id}:`, err);
          try {
            const latestProject = await storage.getProject(project.id);
            if (latestProject) {
              const latestSettings = parseSettings(latestProject.settingsJson);
              (latestSettings as any).geminiStatus = "failed";
              await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(latestSettings) });
              broadcastToRoom(project.id, {
                type: "project-updated",
                userId: project.userId,
                source: "generate-app-failed",
                timestamp: Date.now(),
              });
            }
          } catch {}
        }
      })();
    } catch (err) {
      console.error("Error in generate-app:", err);
      res.status(500).json({ message: "Failed to start generation" });
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

  app.get("/api/project/shared", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const sharedProjects = await storage.getSharedProjects(userId!);
      res.json(sharedProjects);
    } catch (err) {
      console.error("Error listing shared projects:", err);
      res.status(500).json({ message: "Failed to list shared projects" });
    }
  });

  app.get("/api/project/:id", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      res.json({ ...access.project, _userRole: access.role });
    } catch (err) {
      console.error("Error fetching project:", err);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/project/:id/apply-nl", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      if (access.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit" });
      const project = access.project;

      const creditUserId = access.ownerId;
      const user = await storage.getUser(creditUserId);
      const creditsRemaining = user ? Math.max(0, user.totalCredits - user.creditsUsed) : 0;
      if (creditsRemaining <= 0) {
        return res.status(429).json({
          message: "You've used all your credits. Upgrade to Morse Black to get more credits.",
          creditsUsed: user?.creditsUsed ?? 0,
          totalCredits: user?.totalCredits ?? 0,
          creditsRemaining: 0,
          requiresUpgrade: !(user && isActivePremium(user)),
        });
      }

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

      const aiResult = await routePromptAsync({ prompt: commands, project: { ...project, productType: project.productType ?? undefined, font: project.font ?? undefined, themeColor: project.themeColor ?? undefined, settingsJson: project.settingsJson ?? undefined, layoutJson: project.layoutJson ?? undefined, genomeJson: project.genomeJson ?? undefined } });

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

      const nlImproved = improveLayout(currentLayout, {
        pageType: (currentSettings as any)?.pageType,
        mediaAllowed: effectiveMediaAllowed,
      });
      currentLayout = nlImproved.layout;

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

      // If AI is available, mark as pending so a new HTML is generated reflecting the NL change
      if (isGeminiAvailable()) {
        (currentSettings as any).geminiStatus = "pending";
      }

      const creditResult = await storage.deductUserCredits(creditUserId, 1);
      if (!creditResult) {
        return res.status(429).json({
          message: "You've used all your credits. Upgrade to Morse Black to get more credits.",
          creditsUsed: user?.creditsUsed ?? 0,
          totalCredits: user?.totalCredits ?? 0,
          creditsRemaining: 0,
          requiresUpgrade: !(user && isActivePremium(user)),
        });
      }

      const updated = await storage.updateProject(project.id, project.userId, {
        genomeJson: JSON.stringify(currentGenome),
        layoutJson: JSON.stringify(currentLayout),
        settingsJson: JSON.stringify(currentSettings),
        productType: newProductType,
      });

      broadcastToRoom(req.params.id, {
        type: "project-updated",
        userId,
        source: "apply-nl",
        timestamp: Date.now(),
      }, userId!);

      const totalPatchCount = patchSet.genomePatch.length +
        Object.keys(patchSet.settingsPatch).length +
        Object.keys(patchSet.contentPatch).length;

      res.json({
        project: updated,
        description: allDescriptions,
        patchCount: totalPatchCount,
        intents,
        contentPatch,
        creditsUsed: creditResult.creditsUsed,
        totalCredits: creditResult.totalCredits,
        creditsRemaining: creditResult.totalCredits - creditResult.creditsUsed,
      });

      // Fire AI edit (or re-generation) async with the NL instruction applied
      if (isGeminiAvailable()) {
        const genomeCopy = JSON.parse(JSON.stringify(currentGenome));
        const savedSettings = parseSettings(project.settingsJson);
        const existingInterpret = (savedSettings as any).geminiInterpret ?? null;
        const existingHtml: string | null = (savedSettings as any).geminiAppHtml ?? null;
        const brandNameForNL = (currentSettings as any).brandName ?? project.name;

        (async () => {
          try {
            let appHtml: string | null = null;
            let totalTokensUsed = 0;

            if (existingHtml && existingHtml.length > 200) {
              console.log(`[Groq] NL targeted edit for project ${project.id}: "${commands}"`);
              const editResult = await geminiEditApp(existingHtml, commands, brandNameForNL, genomeCopy);
              if (editResult) {
                appHtml = editResult.html;
                totalTokensUsed += editResult.tokensUsed;
              }
            }

            let usedInterpret = existingInterpret;
            if (!appHtml) {
              console.log(`[Groq] NL full re-generation for project ${project.id}: "${commands}"`);
              usedInterpret = existingInterpret ?? await geminiInterpret(project.prompt, project.name);
              if (!usedInterpret) throw new Error("Interpret returned null");

              const nlSettings = parseSettings(project.settingsJson);
              const nlIntegrations: Integration[] = (nlSettings as any).integrations ?? [];

              const genResult = await geminiGenerateApp(
                project.prompt,
                project.name,
                brandNameForNL,
                genomeCopy,
                usedInterpret,
                project.fontUrl,
                project.logoUrl,
                commands,
                nlIntegrations,
              );
              if (genResult) {
                appHtml = genResult.html;
                totalTokensUsed += genResult.tokensUsed;
              }
            }
            if (!appHtml) throw new Error("App generation returned null");

            const tokenCredits = Math.max(0, Math.ceil(totalTokensUsed / TOKENS_PER_CREDIT) - 1);
            if (tokenCredits > 0) {
              await storage.deductUserCredits(project.userId, tokenCredits);
              console.log(`[Groq] Deducted ${tokenCredits} additional token credits (${totalTokensUsed} tokens) for owner ${project.userId}`);
            }

            const latestProject = await storage.getProject(project.id);
            if (!latestProject) return;
            const latestSettings = parseSettings(latestProject.settingsJson);
            (latestSettings as any).geminiStatus = "ready";
            (latestSettings as any).geminiAppHtml = appHtml;
            if (usedInterpret) (latestSettings as any).geminiInterpret = usedInterpret;

            await storage.updateProject(project.id, project.userId, {
              settingsJson: JSON.stringify(latestSettings),
            });
            broadcastToRoom(project.id, {
              type: "project-updated",
              userId: project.userId,
              source: "apply-nl-ai",
              timestamp: Date.now(),
            });
            console.log(`[Groq] NL edit complete for project ${project.id}`);
          } catch (err) {
            console.error(`[Groq] NL edit failed for project ${project.id}:`, err);
            try {
              const latestProject = await storage.getProject(project.id);
              if (latestProject) {
                const latestSettings = parseSettings(latestProject.settingsJson);
                (latestSettings as any).geminiStatus = "failed";
                await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(latestSettings) });
                broadcastToRoom(project.id, {
                  type: "project-updated",
                  userId: project.userId,
                  source: "apply-nl-ai-failed",
                  timestamp: Date.now(),
                });
              }
            } catch {}
          }
        })();
      }

      try {
        if (intents.length > 0) {
          const primaryIntent = intents[0];
          const adaptedIntent = { intentType: primaryIntent.intent, confidence: primaryIntent.confidence } as any;
          const logEntry = buildLogEntry(userId!, commands, adaptedIntent, patchSet as any, project.id);
          const patternId = recordPattern(logEntry.sanitizedPrompt, primaryIntent.intent as any);
          logEntry.patternId = patternId;
          await storage.logPrompt(logEntry as any);
          appendExample({
            prompt: logEntry.sanitizedPrompt,
            intentType: primaryIntent.intent as any,
            confidence: primaryIntent.confidence,
            feedbackSignal: "none",
            timestamp: Date.now(),
          });
          recordAdaptation(logEntry.sanitizedPrompt, primaryIntent.intent as any);
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
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      if (access.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit" });
      const project = access.project;

      const creditUserId = access.ownerId;
      const user = await storage.getUser(creditUserId);
      const creditsRemaining = user ? Math.max(0, user.totalCredits - user.creditsUsed) : 0;
      if (creditsRemaining <= 0) {
        return res.status(429).json({
          message: "You've used all your credits. Upgrade to Morse Black to get more credits.",
          creditsUsed: user?.creditsUsed ?? 0,
          totalCredits: user?.totalCredits ?? 0,
          creditsRemaining: 0,
          requiresUpgrade: !(user && isActivePremium(user)),
        });
      }
      const creditResult = await storage.deductUserCredits(creditUserId, 1);
      if (!creditResult) {
        return res.status(429).json({
          message: "You've used all your credits. Upgrade to Morse Black to get more credits.",
          creditsRemaining: 0,
          requiresUpgrade: true,
        });
      }

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
        const candidate = generateGenome(newStyleSeed) as unknown as Record<string, unknown>;

        const candidateSig = serializeGenomeSig(buildGenomeSig(candidate as unknown as DesignGenome));

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
        newGenome = generateGenome(newStyleSeed) as unknown as Record<string, unknown>;
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
        const styleImproved = improveLayout(regenLayout, {
          pageType: regenPageType,
          mediaAllowed: regenMediaAllowed,
        });
        regenLayout = styleImproved.layout;

        if (!regenMediaAllowed) {
          regenLayout = stripMediaPlacements(regenLayout) as typeof regenLayout;
        }

        newLayoutJson = JSON.stringify(regenLayout);
      }

      // Mark gemini as pending for AI regeneration
      if (isGeminiAvailable()) {
        (currentSettings as any).geminiStatus = "pending";
      }

      const updated = await storage.updateProject(project.id, project.userId, {
        genomeJson: JSON.stringify(newGenome),
        layoutJson: newLayoutJson ?? project.layoutJson ?? undefined,
        styleSeed: newStyleSeed,
        previousGenomesJson: JSON.stringify(updatedHistory.slice(-5)),
        settingsJson: JSON.stringify(currentSettings),
      });

      broadcastToRoom(req.params.id, {
        type: "project-updated",
        userId,
        source: "regenerate-style",
        timestamp: Date.now(),
      }, userId!);

      res.json({ project: updated, styleSeed: newStyleSeed, genome: newGenome });

      // Fire AI app regeneration async with new genome
      if (isGeminiAvailable() && updated) {
        const genomeCopy = JSON.parse(JSON.stringify(newGenome));
        const regenSettings = parseSettings(updated.settingsJson);
        const existingInterpret = (regenSettings as any).geminiInterpret || null;
        const regenBrand = (regenSettings as any).brandName || project.name;
        const regenIntegrations: Integration[] = (regenSettings as any).integrations ?? [];

        (async () => {
          try {
            console.log(`[Groq] Style re-generation for project ${project.id}`);
            const interpret = existingInterpret ?? await geminiInterpret(project.prompt, project.name);
            if (!interpret) throw new Error("Interpret returned null");

            const appResult = await geminiGenerateApp(
              project.prompt,
              project.name,
              regenBrand,
              genomeCopy as any,
              interpret,
              project.fontUrl,
              project.logoUrl,
              null,
              regenIntegrations,
            );
            if (!appResult) throw new Error("App generation returned null");

            const tokenCredits = Math.max(0, Math.ceil(appResult.tokensUsed / TOKENS_PER_CREDIT) - 1);
            if (tokenCredits > 0) {
              await storage.deductUserCredits(creditUserId, tokenCredits);
              console.log(`[Groq] Deducted ${tokenCredits} additional token credits for owner ${creditUserId}`);
            }

            const latestProject = await storage.getProject(project.id);
            if (!latestProject) return;
            const latestSettings = parseSettings(latestProject.settingsJson);
            (latestSettings as any).geminiStatus = "ready";
            (latestSettings as any).geminiAppHtml = appResult.html;
            (latestSettings as any).geminiInterpret = interpret;

            await storage.updateProject(project.id, project.userId, {
              settingsJson: JSON.stringify(latestSettings),
            });
            broadcastToRoom(project.id, {
              type: "project-updated",
              userId: project.userId,
              source: "regenerate-style-ai",
              timestamp: Date.now(),
            });
            console.log(`[Groq] Style re-generation complete for project ${project.id} (${tokenCredits + 1} credits used)`);
          } catch (err) {
            console.error(`[Groq] Style re-generation failed for project ${project.id}:`, err);
            try {
              const latestProject = await storage.getProject(project.id);
              if (latestProject) {
                const latestSettings = parseSettings(latestProject.settingsJson);
                (latestSettings as any).geminiStatus = "failed";
                await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(latestSettings) });
                broadcastToRoom(project.id, {
                  type: "project-updated",
                  userId: project.userId,
                  source: "regenerate-style-ai-failed",
                  timestamp: Date.now(),
                });
              }
            } catch {}
          }
        })();
      }
    } catch (err) {
      console.error("Error regenerating style:", err);
      res.status(500).json({ message: "Failed to regenerate style" });
    }
  });

  app.post("/api/project/:id/regenerate-layout", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      if (access.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit" });
      const project = access.project;
      if (project.layoutLocked) return res.status(400).json({ message: "Layout is locked" });

      const creditUserId = access.ownerId;
      const user = await storage.getUser(creditUserId);
      const creditsRemaining = user ? Math.max(0, user.totalCredits - user.creditsUsed) : 0;
      if (creditsRemaining <= 0) {
        return res.status(429).json({
          message: "You've used all your credits. Upgrade to Morse Black to get more credits.",
          creditsUsed: user?.creditsUsed ?? 0,
          totalCredits: user?.totalCredits ?? 0,
          creditsRemaining: 0,
          requiresUpgrade: !(user && isActivePremium(user)),
        });
      }
      const creditResult = await storage.deductUserCredits(creditUserId, 1);
      if (!creditResult) {
        return res.status(429).json({
          message: "You've used all your credits. Upgrade to Morse Black to get more credits.",
          creditsRemaining: 0,
          requiresUpgrade: true,
        });
      }

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

      const regenImproved = improveLayout(layout, {
        pageType: regenPageType,
        mediaAllowed,
      });
      layout = regenImproved.layout;

      if (!mediaAllowed) {
        layout = stripMediaPlacements(layout) as typeof layout;
      }

      // Mark gemini as pending for AI regeneration
      if (isGeminiAvailable()) {
        (currentSettings as any).geminiStatus = "pending";
      }

      const updated = await storage.updateProject(project.id, project.userId, {
        layoutJson: JSON.stringify(layout),
        settingsJson: JSON.stringify(currentSettings),
      });

      broadcastToRoom(req.params.id, {
        type: "project-updated",
        userId,
        source: "regenerate-layout",
        timestamp: Date.now(),
      }, userId!);

      res.json({
        project: updated,
        layout,
        dnaHash: dna.hash,
        attempts: uniqueDNA.attempts,
      });

      // Fire AI layout rearrangement async (edit existing HTML, don't regenerate from scratch)
      if (isGeminiAvailable() && updated) {
        const genome = project.genomeJson ? JSON.parse(project.genomeJson) : generateGenome(project.seed);
        const layoutRegenSettings = parseSettings(updated.settingsJson);
        const existingHtml = (layoutRegenSettings as any).geminiAppHtml;

        (async () => {
          try {
            if (!existingHtml) {
              console.log(`[Groq] No existing HTML for layout rearrangement, skipping for project ${project.id}`);
              const latestProject = await storage.getProject(project.id);
              if (latestProject) {
                const latestSettings = parseSettings(latestProject.settingsJson);
                (latestSettings as any).geminiStatus = "ready";
                await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(latestSettings) });
              }
              return;
            }

            console.log(`[Groq] Layout rearrangement (edit) for project ${project.id}`);
            const layoutRegenBrand = (layoutRegenSettings as any).brandName || project.name;

            const editInstruction = `Rearrange the layout of this page. Keep ALL existing content, text, data, features, and functionality exactly the same. Only change the visual arrangement:
1. Reorder sections into a different but logical sequence
2. Change card grid layouts (e.g., 3-column to 2-column, or vice versa)
3. Swap between left-aligned and centered section layouts
4. Adjust spacing and padding between sections
5. Keep the navigation bar at the very top of the page
6. Keep the footer at the very bottom
7. Do NOT change any text content, colors, fonts, images, or JavaScript functionality
8. Do NOT remove or add any sections — only rearrange existing ones`;

            const editResult = await geminiEditApp(
              existingHtml,
              editInstruction,
              layoutRegenBrand,
              genome,
            );

            if (!editResult) {
              console.warn(`[Groq] Layout edit returned null for project ${project.id}, keeping existing HTML`);
              const latestProject = await storage.getProject(project.id);
              if (latestProject) {
                const latestSettings = parseSettings(latestProject.settingsJson);
                (latestSettings as any).geminiStatus = "ready";
                await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(latestSettings) });
                broadcastToRoom(project.id, {
                  type: "project-updated",
                  userId: project.userId,
                  source: "regenerate-layout-ai",
                  timestamp: Date.now(),
                });
              }
              return;
            }

            const tokenCredits = Math.max(0, Math.ceil(editResult.tokensUsed / TOKENS_PER_CREDIT) - 1);
            if (tokenCredits > 0) {
              await storage.deductUserCredits(creditUserId, tokenCredits);
              console.log(`[Groq] Deducted ${tokenCredits} additional token credits for owner ${creditUserId}`);
            }

            const latestProject = await storage.getProject(project.id);
            if (!latestProject) return;
            const latestSettings = parseSettings(latestProject.settingsJson);
            (latestSettings as any).geminiStatus = "ready";
            (latestSettings as any).geminiAppHtml = editResult.html;

            await storage.updateProject(project.id, project.userId, {
              settingsJson: JSON.stringify(latestSettings),
            });
            broadcastToRoom(project.id, {
              type: "project-updated",
              userId: project.userId,
              source: "regenerate-layout-ai",
              timestamp: Date.now(),
            });
            console.log(`[Groq] Layout rearrangement complete for project ${project.id} (${tokenCredits + 1} credits used)`);
          } catch (err) {
            console.error(`[Groq] Layout rearrangement failed for project ${project.id}:`, err);
            try {
              const latestProject = await storage.getProject(project.id);
              if (latestProject) {
                const latestSettings = parseSettings(latestProject.settingsJson);
                (latestSettings as any).geminiStatus = "failed";
                await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(latestSettings) });
                broadcastToRoom(project.id, {
                  type: "project-updated",
                  userId: project.userId,
                  source: "regenerate-layout-ai-failed",
                  timestamp: Date.now(),
                });
              }
            } catch {}
          }
        })();
      }
    } catch (err) {
      console.error("Error regenerating layout:", err);
      res.status(500).json({ message: "Failed to regenerate layout" });
    }
  });

  app.patch("/api/project/:id/layout-lock", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      if (access.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit" });
      const project = access.project;
      const { locked } = req.body;
      if (typeof locked !== "boolean") return res.status(400).json({ message: "locked boolean required" });
      const updated = await storage.updateProject(project.id, project.userId, { layoutLocked: locked });
      broadcastToRoom(req.params.id, {
        type: "project-updated",
        userId,
        source: "layout-lock",
        timestamp: Date.now(),
      }, userId!);
      res.json(updated);
    } catch (err) {
      console.error("Error toggling layout lock:", err);
      res.status(500).json({ message: "Failed to toggle layout lock" });
    }
  });

  app.post("/api/project/:id/correct-context", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      if (access.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit" });
      const project = access.project;

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
        productType: updatedCtx.productType ?? (currentSettings as any).productType,
        promptContent,
        contextLock: newContextLock,
      };

      const updated = await storage.updateProject(project.id, project.userId, {
        settingsJson: JSON.stringify(newSettings),
        productType: updatedCtx.productType ?? project.productType ?? undefined,
      });

      broadcastToRoom(req.params.id, {
        type: "project-updated",
        userId,
        source: "correct-context",
        timestamp: Date.now(),
      }, userId!);

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

  app.post("/api/project/:id/integrations", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      if (access.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit" });
      const project = access.project;
      const { integrations } = req.body as { integrations: Integration[] };
      if (!Array.isArray(integrations)) return res.status(400).json({ message: "integrations must be an array" });
      const settings = parseSettings(project.settingsJson);
      (settings as any).integrations = integrations;
      await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(settings) });
      broadcastToRoom(req.params.id, {
        type: "project-updated",
        userId,
        source: "integrations",
        timestamp: Date.now(),
      }, userId!);
      res.json({ ok: true });
    } catch (err) {
      console.error("Error saving integrations:", err);
      res.status(500).json({ message: "Failed to save integrations" });
    }
  });

  app.post("/api/project/:id/update-html", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      if (access.role === "viewer") return res.status(403).json({ message: "Viewers cannot edit" });
      const project = access.project;
      const { html } = req.body as { html: string };
      if (typeof html !== "string") return res.status(400).json({ message: "html must be a string" });
      const settings = parseSettings(project.settingsJson);
      (settings as any).geminiAppHtml = html;
      (settings as any).geminiStatus = "ready";
      await storage.updateProject(project.id, project.userId, { settingsJson: JSON.stringify(settings) });
      broadcastToRoom(req.params.id, {
        type: "project-updated",
        userId,
        source: "update-html",
        timestamp: Date.now(),
      }, userId!);
      res.json({ ok: true });
    } catch (err) {
      console.error("Error updating HTML:", err);
      res.status(500).json({ message: "Failed to update HTML" });
    }
  });

  app.delete("/api/project/:id", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Only the owner can delete a project" });
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

      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      const project = access.project;

      const owner = await storage.getUser(access.ownerId);
      if (!owner || !isActivePremium(owner)) {
        return res.status(403).json({
          message: "Export is available exclusively for Morse Black subscribers.",
          requiresUpgrade: true,
        });
      }

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

  app.get("/api/project/:id/collaborators", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const access = await checkProjectAccess(req.params.id, userId!);
      if (!access.allowed) return res.status(access.status).json({ message: access.message });
      const collaborators = await storage.getCollaborators(req.params.id);
      const owner = await storage.getUser(access.ownerId);
      res.json({
        owner: owner ? { userId: owner.id, email: owner.email, role: "owner" } : null,
        collaborators,
        maxCollaborators: MAX_COLLABORATORS,
      });
    } catch (err) {
      console.error("Error listing collaborators:", err);
      res.status(500).json({ message: "Failed to list collaborators" });
    }
  });

  app.post("/api/project/:id/collaborators", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Only the project owner can invite collaborators" });

      const owner = await storage.getUser(userId!);
      if (!owner || !isActivePremium(owner)) {
        return res.status(403).json({ message: "Collaboration is a Morse Black feature. Upgrade to invite collaborators.", requiresUpgrade: true });
      }

      const { email, role } = req.body;
      if (!email || typeof email !== "string") return res.status(400).json({ message: "Email is required" });
      if (!role || !["viewer", "editor"].includes(role)) return res.status(400).json({ message: "Role must be 'viewer' or 'editor'" });

      if (email === owner.email) return res.status(400).json({ message: "You cannot invite yourself" });

      const count = await storage.getCollaboratorCount(req.params.id);
      if (count >= MAX_COLLABORATORS) return res.status(400).json({ message: `Maximum ${MAX_COLLABORATORS} collaborators per project` });

      const existingByEmail = await storage.getCollaboratorRoleByEmail(req.params.id, email);
      if (existingByEmail) return res.status(400).json({ message: "This user is already a collaborator" });

      const targetUser = await storage.getUserByEmail(email);
      const targetUserId = targetUser?.id || `pending_${email.toLowerCase()}`;

      if (targetUser) {
        const existingRole = await storage.getCollaboratorRole(req.params.id, targetUser.id);
        if (existingRole) return res.status(400).json({ message: "This user is already a collaborator" });
      }

      console.log(`[Collab] Adding collaborator: projectId=${req.params.id}, targetUserId=${targetUserId}, email=${email}, role=${role}, pending=${!targetUser}`);
      const collab = await storage.addCollaborator(req.params.id, targetUserId, email, role, userId!);

      sendCollaborationInviteEmail(email, project.name, req.params.id, role, owner.email).catch((err) => {
        console.error("[Collab] Failed to send invite email:", err);
      });

      res.json(collab);
    } catch (err) {
      console.error("Error adding collaborator:", err);
      res.status(500).json({ message: "Failed to add collaborator" });
    }
  });

  app.patch("/api/project/:id/collaborators/:collabUserId", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.userId !== userId) return res.status(403).json({ message: "Only the project owner can change roles" });
      const { role } = req.body;
      if (!role || !["viewer", "editor"].includes(role)) return res.status(400).json({ message: "Role must be 'viewer' or 'editor'" });
      const updated = await storage.updateCollaboratorRole(req.params.id, req.params.collabUserId, role);
      if (!updated) return res.status(404).json({ message: "Collaborator not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating collaborator role:", err);
      res.status(500).json({ message: "Failed to update collaborator role" });
    }
  });

  app.delete("/api/project/:id/collaborators/:collabUserId", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      const project = await storage.getProject(req.params.id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      const isSelfLeave = req.params.collabUserId === userId;
      if (project.userId !== userId && !isSelfLeave) {
        return res.status(403).json({ message: "Only the owner can remove collaborators" });
      }
      await storage.removeCollaborator(req.params.id, req.params.collabUserId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error removing collaborator:", err);
      res.status(500).json({ message: "Failed to remove collaborator" });
    }
  });

  const ADMIN_EMAIL = "morsenj2@gmail.com";

  function isAdmin(user: { email: string } | undefined): boolean {
    return !!user && user.email === ADMIN_EMAIL;
  }

  app.get("/api/blog/list", async (_req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/admin-status", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.json({ isAdmin: false });
      const user = await storage.getUser(userId);
      res.json({ isAdmin: isAdmin(user) });
    } catch (err) {
      res.json({ isAdmin: false });
    }
  });

  app.post("/api/blog/create", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const parsed = insertBlogPostSchema.safeParse({
        ...req.body,
        authorEmail: user!.email,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const post = await storage.createBlogPost(parsed.data);
      res.json(post);
    } catch (err) {
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  app.delete("/api/blog/:id", requireAuth, async (req, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      await storage.deleteBlogPost(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  return httpServer;
}
