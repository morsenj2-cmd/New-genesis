import type { DesignGenome } from "./genomeGenerator";

export interface DesignSources {
  uploadedLogoUrl?: string | null;
  selectedFont?: string | null;
  selectedPrimaryColor?: string | null;
  productType?: string | null;
}

const FONT_MAP: Record<string, string> = {
  inter: "Inter",
  "plus jakarta sans": "Plus Jakarta Sans",
  "ibm plex sans": "IBM Plex Sans",
  "space grotesk": "Space Grotesk",
  arimo: "Arimo",
  nunito: "Nunito",
  lora: "Lora",
  "playfair display": "Playfair Display",
  roboto: "Roboto",
  "source sans pro": "Source Sans Pro",
};

function normaliseFont(font: string): string {
  const lower = font.trim().toLowerCase();
  return FONT_MAP[lower] ?? font.trim();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function buildPalette(h: number, s: number, l: number) {
  const secH = (h + 30) % 360;
  const accH = (h + 150) % 360;
  return {
    primary: `hsl(${h}, ${s}%, ${l}%)`,
    secondary: `hsl(${secH}, ${Math.max(30, s - 10)}%, ${Math.max(30, l - 5)}%)`,
    accent: `hsl(${accH}, ${Math.min(90, s + 5)}%, ${l}%)`,
    hues: { primary: h, secondary: secH, accent: accH },
  };
}

export function mergeDesignSources(
  genome: DesignGenome,
  sources: DesignSources,
): DesignGenome {
  const merged: DesignGenome = JSON.parse(JSON.stringify(genome));

  if (sources.selectedFont) {
    const font = normaliseFont(sources.selectedFont);
    merged.typography.heading = font;
    merged.typography.body = font;
  }

  if (sources.selectedPrimaryColor) {
    const color = sources.selectedPrimaryColor.trim();
    if (color.startsWith("#") && color.length >= 7) {
      const hsl = hexToHsl(color);
      if (hsl) {
        const palette = buildPalette(hsl.h, hsl.s, hsl.l);
        merged.colors.primary = palette.primary;
        merged.colors.secondary = palette.secondary;
        merged.colors.accent = palette.accent;
        merged.colors.hues = palette.hues;
      } else {
        merged.colors.primary = color;
      }
    } else if (color.startsWith("hsl")) {
      merged.colors.primary = color;
    } else {
      merged.colors.primary = color;
    }
  }

  return merged;
}
