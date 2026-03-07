import type { DesignGenome } from "./genomeGenerator";

export interface ProjectSettings {
  uniqueIcons: boolean;
  forceStandardGenome: boolean;
  industry: "general" | "saas" | "ecommerce" | "media" | "tech";
  tone: "creative" | "clean" | "bold" | "minimal";
}

export const DEFAULT_SETTINGS: ProjectSettings = {
  uniqueIcons: true,
  forceStandardGenome: false,
  industry: "general",
  tone: "creative",
};

const SAAS_SAFE_FONTS = ["Inter", "IBM Plex Sans", "Plus Jakarta Sans"];

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function detectIndustryFromText(text: string): ProjectSettings["industry"] {
  const t = text.toLowerCase();
  if (/\b(saas|cloud|api|platform|software|storage|object storage|s3|b2b|enterprise)\b/.test(t)) {
    return "saas";
  }
  if (/\b(shop|store|ecommerce|e-commerce|product|cart|checkout)\b/.test(t)) {
    return "ecommerce";
  }
  if (/\b(news|blog|media|content|article|magazine|editorial)\b/.test(t)) {
    return "media";
  }
  if (/\b(tech|startup|developer|dev|engineering|code|coding)\b/.test(t)) {
    return "tech";
  }
  return "general";
}

export function applySaasConstraints(genome: DesignGenome): DesignGenome {
  const safeFont = SAAS_SAFE_FONTS[0];
  return {
    ...genome,
    colors: {
      primary:    hsl(210, 55, 50),
      secondary:  hsl(215, 25, 45),
      accent:     hsl(200, 50, 55),
      background: hsl(222, 15, 5),
      surface:    hsl(222, 12, 9),
      hues: { primary: 210, secondary: 215, accent: 200 },
    },
    typography: {
      ...genome.typography,
      heading: safeFont,
      body: safeFont,
    },
    iconStyle: {
      strokeWidth: 1.5,
      cornerRoundness: 20,
      geometryBias: "geometric",
      variant: "outline",
    },
    motion: {
      duration: { fast: "100ms", base: "200ms", slow: "350ms" },
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      easingName: "Ease In-Out",
    },
    radius: {
      sm: "4px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      full: "9999px",
    },
  };
}

export function maybeApplyIndustryConstraints(
  genome: DesignGenome,
  settings: ProjectSettings,
): DesignGenome {
  if (settings.industry === "saas" || settings.forceStandardGenome) {
    return applySaasConstraints(genome);
  }
  return genome;
}

export function parseSettings(json: string | null | undefined): ProjectSettings {
  if (!json) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
