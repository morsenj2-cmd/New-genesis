import type { UniversalContext } from "./universalContext";

export interface ContextLock {
  industry: string | null;
  productType: string | null;
  coreActivities: string[] | null;
  pageType: string | null;
  locked: boolean;
}

export const EMPTY_CONTEXT_LOCK: ContextLock = {
  industry: null,
  productType: null,
  coreActivities: null,
  pageType: null,
  locked: false,
};

export function createContextLock(context: UniversalContext): ContextLock {
  return {
    industry: context.industry,
    productType: context.productType,
    coreActivities: context.coreActivities.length > 0 ? context.coreActivities : null,
    pageType: context.pageType,
    locked: true,
  };
}

export function extractContextLock(settingsJson: string | null | undefined): ContextLock {
  if (!settingsJson) return { ...EMPTY_CONTEXT_LOCK };
  try {
    const settings = JSON.parse(settingsJson);
    if (settings.contextLock && settings.contextLock.locked) {
      return settings.contextLock as ContextLock;
    }
    return { ...EMPTY_CONTEXT_LOCK };
  } catch {
    return { ...EMPTY_CONTEXT_LOCK };
  }
}

export function applyContextLock(settings: Record<string, unknown>, lock: ContextLock): Record<string, unknown> {
  return {
    ...settings,
    contextLock: lock,
  };
}

export function enforceContextLock(
  newSettings: Record<string, unknown>,
  lock: ContextLock,
): Record<string, unknown> {
  if (!lock.locked) return newSettings;

  const enforced = { ...newSettings };

  if (lock.industry !== null) {
    enforced.industry = lock.industry;
  }
  if (lock.productType !== null) {
    enforced.productType = lock.productType;
  }
  if (lock.coreActivities !== null) {
    enforced.coreActivities = lock.coreActivities;
  }
  if (lock.pageType !== null) {
    enforced.pageType = lock.pageType;
  }

  enforced.contextLock = lock;

  return enforced;
}

export function isContextField(key: string): boolean {
  return ["industry", "productType", "coreActivities", "pageType"].includes(key);
}

export function filterLockedFields(
  patch: Record<string, unknown>,
  lock: ContextLock,
): Record<string, unknown> {
  if (!lock.locked) return patch;

  const filtered = { ...patch };

  if (lock.industry !== null && "industry" in filtered) {
    delete filtered.industry;
  }
  if (lock.productType !== null && "productType" in filtered) {
    delete filtered.productType;
  }
  if (lock.coreActivities !== null && "coreActivities" in filtered) {
    delete filtered.coreActivities;
  }
  if (lock.pageType !== null && "pageType" in filtered) {
    delete filtered.pageType;
  }

  return filtered;
}
