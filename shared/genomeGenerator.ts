export interface BrandingTokens {
  logoColor?: string;
  logoFont?: string;
  logoSize?: string;
  logoWeight?: number;
}

export interface VariationTokens {
  colorMode: "vibrant" | "muted" | "pastel" | "deep" | "neon";
  spacingMode: "tight" | "balanced" | "spacious" | "airy";
  surfaceStyle: "flat" | "layered" | "glass" | "elevated";
  buttonStyle: "rounded" | "pill" | "sharp" | "soft";
  cardStyle: "bordered" | "filled" | "minimal" | "elevated";
}

export interface DesignGenome {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    hues: { primary: number; secondary: number; accent: number };
  };
  typography: {
    heading: string;
    body: string;
    mono: string;
    scaleRatio: number;
    sizes: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      "2xl": string;
      "3xl": string;
    };
    headingWeight?: number;
    letterSpacing?: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    base: number;
    ratio: number;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  iconStyle: {
    strokeWidth: number;
    cornerRoundness: number;
    geometryBias: "geometric" | "organic";
    variant: "outline" | "filled";
  };
  motion: {
    duration: {
      fast: string;
      base: string;
      slow: string;
    };
    easing: string;
    easingName: string;
  };
  variation?: VariationTokens;
  branding?: BrandingTokens;
}

const FONT_PAIRS: [string, string][] = [
  ["Inter", "Inter"],
  ["Poppins", "Poppins"],
  ["Space Grotesk", "Space Grotesk"],
  ["IBM Plex Sans", "IBM Plex Sans"],
  ["Plus Jakarta Sans", "Plus Jakarta Sans"],
  ["Inter", "Space Grotesk"],
  ["Poppins", "Plus Jakarta Sans"],
  ["Space Grotesk", "IBM Plex Sans"],
  ["Plus Jakarta Sans", "Inter"],
  ["IBM Plex Sans", "Poppins"],
  ["Outfit", "Outfit"],
  ["DM Sans", "DM Sans"],
  ["Manrope", "Manrope"],
  ["Geist", "Geist"],
  ["Syne", "Syne"],
  ["Playfair Display", "Lora"],
  ["Cormorant", "Raleway"],
  ["Fraunces", "Source Sans 3"],
  ["Libre Baskerville", "Libre Baskerville"],
  ["Merriweather", "Open Sans"],
  ["Space Mono", "Space Grotesk"],
  ["JetBrains Mono", "Inter"],
  ["Roboto Mono", "Roboto"],
  ["Fira Code", "Fira Sans"],
  ["Nunito", "Nunito"],
  ["Quicksand", "Quicksand"],
  ["Rubik", "Rubik"],
  ["Work Sans", "Work Sans"],
  ["Karla", "Karla"],
  ["Cabin", "Cabin"],
];

const MONO_FONTS = [
  "JetBrains Mono",
  "Fira Code",
  "IBM Plex Mono",
  "Space Mono",
  "Roboto Mono",
];

const SCALE_RATIOS = [
  { ratio: 1.125, name: "Major Second" },
  { ratio: 1.2, name: "Minor Third" },
  { ratio: 1.25, name: "Major Third" },
  { ratio: 1.333, name: "Perfect Fourth" },
  { ratio: 1.414, name: "Augmented Fourth" },
  { ratio: 1.5, name: "Perfect Fifth" },
];

const HUE_OFFSETS = [30, 60, 120, 150, 180, 210, 240, 270];

const EASING_CURVES = [
  { curve: "cubic-bezier(0.4, 0, 0.2, 1)", name: "Ease In-Out" },
  { curve: "cubic-bezier(0, 0, 0.2, 1)", name: "Ease Out" },
  { curve: "cubic-bezier(0.4, 0, 1, 1)", name: "Ease In" },
  { curve: "cubic-bezier(0.34, 1.56, 0.64, 1)", name: "Spring Bounce" },
  { curve: "cubic-bezier(0.16, 1, 0.3, 1)", name: "Expo Out" },
  { curve: "cubic-bezier(0.87, 0, 0.13, 1)", name: "Expo In-Out" },
];

const COLOR_MODES: VariationTokens["colorMode"][] = ["vibrant", "muted", "pastel", "deep", "neon"];
const SPACING_MODES: VariationTokens["spacingMode"][] = ["tight", "balanced", "spacious", "airy"];
const SURFACE_STYLES: VariationTokens["surfaceStyle"][] = ["flat", "layered", "glass", "elevated"];
const BUTTON_STYLES: VariationTokens["buttonStyle"][] = ["rounded", "pill", "sharp", "soft"];
const CARD_STYLES: VariationTokens["cardStyle"][] = ["bordered", "filled", "minimal", "elevated"];

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

export interface GenomeGenerationOptions {
  forceStandard?: boolean;
  [key: string]: unknown;
}

export function generateGenome(
  seed: string,
  _designContext?: Record<string, unknown>,
  options?: GenomeGenerationOptions,
): DesignGenome {
  if (!seed || seed.length < 32) {
    throw new Error("Seed must be at least 32 hex characters");
  }

  const s = seed.toLowerCase().padEnd(64, "0");

  const n = (offset: number, len = 2): number =>
    parseInt(s.slice(offset, offset + len), 16);

  // ── VARIATION DIMENSIONS ─────────────────────────────────────
  const colorMode = COLOR_MODES[n(46) % COLOR_MODES.length];
  const spacingMode = SPACING_MODES[n(48) % SPACING_MODES.length];
  const surfaceStyle = SURFACE_STYLES[n(50) % SURFACE_STYLES.length];
  const buttonStyle = BUTTON_STYLES[n(52) % BUTTON_STYLES.length];
  const cardStyle = CARD_STYLES[n(54) % CARD_STYLES.length];

  // ── COLORS ────────────────────────────────────────────────────
  const primaryHue = n(0, 4) % 360;
  const secondaryHue = (primaryHue + HUE_OFFSETS[n(4) % HUE_OFFSETS.length]) % 360;
  const accentHue = (primaryHue + HUE_OFFSETS[n(6) % HUE_OFFSETS.length] + 60) % 360;

  // Vary saturation/lightness by color mode
  let satBoost = 0;
  let lightShift = 0;
  if (colorMode === "vibrant") { satBoost = 15; lightShift = 3; }
  else if (colorMode === "muted") { satBoost = -15; lightShift = 0; }
  else if (colorMode === "pastel") { satBoost = -20; lightShift = 15; }
  else if (colorMode === "deep") { satBoost = 10; lightShift = -8; }
  else if (colorMode === "neon") { satBoost = 25; lightShift = 5; }

  const primarySat = Math.max(30, Math.min(95, 55 + (n(8) % 35) + satBoost));
  const primaryLight = Math.max(30, Math.min(75, 44 + (n(10) % 18) + lightShift));

  const secondarySat = Math.max(25, Math.min(90, 45 + (n(12) % 35) + satBoost));
  const secondaryLight = Math.max(25, Math.min(72, 38 + (n(14) % 22) + lightShift));

  const accentSat = Math.max(40, Math.min(100, 65 + (n(16) % 25) + satBoost));
  const accentLight = Math.max(35, Math.min(78, 48 + (n(18) % 16) + lightShift));

  const bgLightness = 3 + (n(20) % 7);
  const surfLightness = bgLightness + 4 + (n(22) % 5);

  // ── TYPOGRAPHY ────────────────────────────────────────────────
  const pair = FONT_PAIRS[n(24, 2) % FONT_PAIRS.length];
  const monoFont = MONO_FONTS[n(26) % MONO_FONTS.length];
  const scaleEntry = SCALE_RATIOS[n(28) % SCALE_RATIOS.length];
  const ratio = scaleEntry.ratio;
  const baseSize = 16;

  const typeSizes = {
    xs: `${(baseSize * Math.pow(ratio, -2)).toFixed(2)}px`,
    sm: `${(baseSize * Math.pow(ratio, -1)).toFixed(2)}px`,
    base: `${baseSize}px`,
    lg: `${(baseSize * Math.pow(ratio, 1)).toFixed(2)}px`,
    xl: `${(baseSize * Math.pow(ratio, 2)).toFixed(2)}px`,
    "2xl": `${(baseSize * Math.pow(ratio, 3)).toFixed(2)}px`,
    "3xl": `${(baseSize * Math.pow(ratio, 4)).toFixed(2)}px`,
  };

  // ── SPACING ───────────────────────────────────────────────────
  const spacingBase = 4;
  let spacingRatioBase = 1.2 + (n(30) % 20) / 100;
  // Vary by spacing mode
  if (spacingMode === "tight") spacingRatioBase = Math.max(1.15, spacingRatioBase - 0.08);
  else if (spacingMode === "spacious") spacingRatioBase = Math.min(1.5, spacingRatioBase + 0.1);
  else if (spacingMode === "airy") spacingRatioBase = Math.min(1.6, spacingRatioBase + 0.2);
  const spacingRatio = spacingRatioBase;
  const sp = (exp: number) => `${Math.round(spacingBase * Math.pow(spacingRatio, exp))}px`;

  // ── BORDER RADIUS ─────────────────────────────────────────────
  let baseRadius = 4 + (n(32) % 17);
  // Vary by button style
  if (buttonStyle === "pill") baseRadius = Math.min(32, baseRadius + 12);
  else if (buttonStyle === "sharp") baseRadius = Math.min(4, Math.max(1, baseRadius - 6));
  else if (buttonStyle === "soft") baseRadius = Math.min(16, baseRadius + 4);

  // ── ICON STYLE ────────────────────────────────────────────────
  const strokeWidths = [1, 1.5, 2, 2.5];
  const strokeWidth = strokeWidths[n(34) % strokeWidths.length];
  const cornerRoundness = n(36) % 101;
  const geometryBias: "geometric" | "organic" = n(38) % 2 === 0 ? "geometric" : "organic";
  const variant: "outline" | "filled" = n(40) % 2 === 0 ? "outline" : "filled";

  // ── MOTION ───────────────────────────────────────────────────
  const durationBase = 150 + (n(42) % 201);
  const easingEntry = EASING_CURVES[n(44) % EASING_CURVES.length];

  return {
    colors: {
      primary: hsl(primaryHue, primarySat, primaryLight),
      secondary: hsl(secondaryHue, secondarySat, secondaryLight),
      accent: hsl(accentHue, accentSat, accentLight),
      background: hsl(primaryHue, 10, bgLightness),
      surface: hsl(primaryHue, 8, surfLightness),
      hues: { primary: primaryHue, secondary: secondaryHue, accent: accentHue },
    },
    typography: {
      heading: pair[0],
      body: pair[1],
      mono: monoFont,
      scaleRatio: ratio,
      sizes: typeSizes,
    },
    spacing: {
      xs: sp(0),
      sm: sp(1),
      md: sp(2),
      lg: sp(3),
      xl: sp(4),
      "2xl": sp(5),
      base: spacingBase,
      ratio: Math.round(spacingRatio * 1000) / 1000,
    },
    radius: {
      sm: `${Math.max(1, Math.round(baseRadius * 0.5))}px`,
      md: `${baseRadius}px`,
      lg: `${Math.round(baseRadius * 1.5)}px`,
      xl: `${Math.round(baseRadius * 2)}px`,
      full: "9999px",
    },
    iconStyle: {
      strokeWidth,
      cornerRoundness,
      geometryBias,
      variant,
    },
    motion: {
      duration: {
        fast: `${Math.round(durationBase * 0.5)}ms`,
        base: `${durationBase}ms`,
        slow: `${Math.round(durationBase * 1.75)}ms`,
      },
      easing: easingEntry.curve,
      easingName: easingEntry.name,
    },
    variation: {
      colorMode,
      spacingMode,
      surfaceStyle,
      buttonStyle,
      cardStyle,
    },
  };
}
