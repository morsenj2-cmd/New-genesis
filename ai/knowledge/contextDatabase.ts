import { storage } from "../../server/storage";
import type { ReasonedContext } from "../context/contextReasoner";

export interface StoredContext {
  promptHash: string;
  domain: string;
  interpretedContext: ReasonedContext;
  retrievedSources: string[];
  generatedInterfacePatterns: string[];
  internetContext?: InternetContextSummary;
  validationScore?: number;
}

export interface InternetContextSummary {
  concepts: string[];
  workflows: string[];
  entities: string[];
  sources: string[];
}

function hashPrompt(prompt: string): string {
  const normalized = prompt.toLowerCase().trim().replace(/\s+/g, " ");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `ctx_${Math.abs(hash).toString(36)}`;
}

const _memoryCache: Map<string, { data: StoredContext; timestamp: number }> = new Map();
const MEMORY_TTL_MS = 4 * 60 * 60 * 1000;
const MAX_MEMORY_SIZE = 500;

export async function lookupContext(prompt: string): Promise<StoredContext | null> {
  const hash = hashPrompt(prompt);

  const cached = _memoryCache.get(hash);
  if (cached && Date.now() - cached.timestamp < MEMORY_TTL_MS) {
    return cached.data;
  }

  try {
    const row = await storage.getContextByHash(hash);
    if (row) {
      await storage.incrementContextUsage(row.id).catch(() => {});
      const stored: StoredContext = {
        promptHash: row.promptHash,
        domain: row.domain,
        interpretedContext: JSON.parse(row.interpretedContext),
        retrievedSources: JSON.parse(row.retrievedSources),
        generatedInterfacePatterns: JSON.parse(row.generatedInterfacePatterns),
        internetContext: row.internetContext ? JSON.parse(row.internetContext) : undefined,
        validationScore: row.validationScore ?? undefined,
      };
      cacheInMemory(hash, stored);
      return stored;
    }
  } catch {}

  return null;
}

export async function lookupDomainContexts(domain: string): Promise<StoredContext[]> {
  try {
    const rows = await storage.getContextByDomain(domain);
    return rows.map(row => ({
      promptHash: row.promptHash,
      domain: row.domain,
      interpretedContext: JSON.parse(row.interpretedContext),
      retrievedSources: JSON.parse(row.retrievedSources),
      generatedInterfacePatterns: JSON.parse(row.generatedInterfacePatterns),
      internetContext: row.internetContext ? JSON.parse(row.internetContext) : undefined,
      validationScore: row.validationScore ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function storeContextResult(
  prompt: string,
  context: ReasonedContext,
  sources: string[],
  interfacePatterns: string[],
  internetContext?: InternetContextSummary,
  validationScore?: number,
): Promise<void> {
  const hash = hashPrompt(prompt);

  const existing = await lookupContext(prompt);
  if (existing) return;

  const stored: StoredContext = {
    promptHash: hash,
    domain: context.domain,
    interpretedContext: context,
    retrievedSources: sources,
    generatedInterfacePatterns: interfacePatterns,
    internetContext,
    validationScore,
  };

  cacheInMemory(hash, stored);

  try {
    await storage.storeContext({
      promptHash: hash,
      domain: context.domain,
      interpretedContext: JSON.stringify(context),
      retrievedSources: JSON.stringify(sources),
      generatedInterfacePatterns: JSON.stringify(interfacePatterns),
      internetContext: internetContext ? JSON.stringify(internetContext) : null,
      validationScore: validationScore ?? null,
      usageCount: 1,
    });
  } catch {}
}

export function enrichFromStoredContext(
  currentContext: ReasonedContext,
  stored: StoredContext,
): ReasonedContext {
  const storedCtx = stored.interpretedContext;

  const mergedEntities = [...new Set([...currentContext.entities, ...storedCtx.entities])];
  const mergedActions = [...new Set([...currentContext.userActions, ...storedCtx.userActions])];
  const mergedConcepts = [...new Set([...currentContext.operationalConcepts, ...storedCtx.operationalConcepts])];
  const mergedRequirements = [...new Set([...currentContext.interfaceRequirements, ...storedCtx.interfaceRequirements])];

  return {
    ...currentContext,
    entities: mergedEntities.slice(0, 60),
    userActions: mergedActions.slice(0, 45),
    operationalConcepts: mergedConcepts.slice(0, 45),
    interfaceRequirements: mergedRequirements.slice(0, 60),
    confidence: Math.min(0.95, currentContext.confidence + 0.1),
  };
}

function cacheInMemory(hash: string, data: StoredContext): void {
  if (_memoryCache.size >= MAX_MEMORY_SIZE) {
    const oldest = [..._memoryCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) _memoryCache.delete(oldest[0]);
  }
  _memoryCache.set(hash, { data, timestamp: Date.now() });
}

export function lookupContextFromMemory(prompt: string): StoredContext | null {
  const hash = hashPrompt(prompt);
  const cached = _memoryCache.get(hash);
  if (cached && Date.now() - cached.timestamp < MEMORY_TTL_MS) {
    return cached.data;
  }
  return null;
}

export function getContextDatabaseStats(): { memoryEntries: number } {
  return { memoryEntries: _memoryCache.size };
}
