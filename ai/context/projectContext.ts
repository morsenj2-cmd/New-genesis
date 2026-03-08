import type { ProjectContext } from "../model/promptSchema";

interface ProjectRecord {
  prompt: string;
  name?: string;
  productType?: string;
  font?: string;
  themeColor?: string;
  settingsJson?: string;
  layoutJson?: string;
  genomeJson?: string;
}

export function extractProjectContext(project: ProjectRecord): ProjectContext {
  let industry: string | undefined;
  let pageType: string | undefined;
  let brandName: string | undefined;
  let primaryColor: string | undefined;
  let sections: string[] = [];
  let dominantAlignment: string | undefined;

  if (project.settingsJson) {
    try {
      const settings = JSON.parse(project.settingsJson);
      industry = settings.industry ?? settings.contextLock?.industry;
      pageType = settings.pageType ?? settings.contextLock?.pageType;
      brandName = settings.brandName;
      primaryColor = settings.primaryColor ?? project.themeColor;
    } catch {}
  }

  if (project.layoutJson) {
    try {
      const layout = JSON.parse(project.layoutJson);
      if (Array.isArray(layout.sections)) {
        sections = layout.sections.map((s: any) => s.type ?? "unknown");
      }
      dominantAlignment = layout.metadata?.dominantAlignment;
    } catch {}
  }

  if (project.genomeJson) {
    try {
      const genome = JSON.parse(project.genomeJson);
      primaryColor = primaryColor ?? genome.colors?.primary;
    } catch {}
  }

  return {
    industry,
    productType: project.productType ?? undefined,
    pageType,
    brandName: brandName ?? project.name,
    sections,
    primaryColor: primaryColor ?? project.themeColor,
    font: project.font,
    dominantAlignment,
  };
}

export function serializeContextForModel(ctx: ProjectContext): string {
  const parts: string[] = [];
  if (ctx.industry) parts.push(`industry: ${ctx.industry}`);
  if (ctx.productType) parts.push(`product: ${ctx.productType}`);
  if (ctx.pageType) parts.push(`page: ${ctx.pageType}`);
  if (ctx.brandName) parts.push(`brand: ${ctx.brandName}`);
  if (ctx.sections.length > 0) parts.push(`sections: ${ctx.sections.join(", ")}`);
  if (ctx.font) parts.push(`font: ${ctx.font}`);
  return parts.join(" | ");
}

export function mergeContextHints(base: ProjectContext, hints: Partial<ProjectContext>): ProjectContext {
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(hints).filter(([, v]) => v !== undefined && v !== null),
    ),
    sections: hints.sections ?? base.sections,
  };
}
