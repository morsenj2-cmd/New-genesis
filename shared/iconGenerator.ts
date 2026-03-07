export type IconName =
  | "chat" | "mail" | "phone" | "notification" | "broadcast"
  | "search" | "menu" | "home" | "arrow" | "compass"
  | "settings" | "filter" | "grid" | "list" | "close"
  | "cart" | "tag" | "wallet" | "receipt" | "package"
  | "play" | "image" | "video" | "music" | "microphone";

export type IconGroup = "communication" | "navigation" | "system" | "commerce" | "media";

export const ICON_GROUPS: Record<IconName, IconGroup> = {
  chat: "communication", mail: "communication", phone: "communication",
  notification: "communication", broadcast: "communication",
  search: "navigation", menu: "navigation", home: "navigation",
  arrow: "navigation", compass: "navigation",
  settings: "system", filter: "system", grid: "system",
  list: "system", close: "system",
  cart: "commerce", tag: "commerce", wallet: "commerce",
  receipt: "commerce", package: "commerce",
  play: "media", image: "media", video: "media",
  music: "media", microphone: "media",
};

export const GROUP_ICONS: Record<IconGroup, IconName[]> = {
  communication: ["chat", "mail", "phone", "notification", "broadcast"],
  navigation: ["search", "menu", "home", "arrow", "compass"],
  system: ["settings", "filter", "grid", "list", "close"],
  commerce: ["cart", "tag", "wallet", "receipt", "package"],
  media: ["play", "image", "video", "music", "microphone"],
};

export const GROUP_LABELS: Record<IconGroup, string> = {
  communication: "Communication",
  navigation: "Navigation",
  system: "System",
  commerce: "Commerce",
  media: "Media",
};

export interface GenomeIconStyle {
  strokeWidth: number;
  cornerRoundness: number;
  geometryBias: "geometric" | "organic";
  variant: "outline" | "filled";
}

function cr(s: GenomeIconStyle, max = 10): number {
  return Math.round((s.cornerRoundness / 100) * max);
}

function rr(x: number, y: number, w: number, h: number, r: number): string {
  const safe = Math.min(r, Math.min(w, h) / 2);
  if (safe <= 0) return `M${x},${y} h${w} v${h} h-${w}Z`;
  return `M${x + safe},${y} h${w - safe * 2} q${safe},0 ${safe},${safe} v${h - safe * 2} q0,${safe} -${safe},${safe} h-${w - safe * 2} q-${safe},0 -${safe},-${safe} v-${h - safe * 2} q0,-${safe} ${safe},-${safe}Z`;
}

type Renderer = (s: GenomeIconStyle) => string;

const RENDERERS: Record<IconName, Renderer> = {

  chat: (s) => {
    const r = cr(s, 6);
    const tail = s.geometryBias === "organic"
      ? `M6,18 Q4,21 4,22 Q7.5,20.5 10,18Z`
      : `M6,18 L4,22 L10,18Z`;
    return `<path d="${rr(2, 2, 20, 15, r)} ${tail}"/>`;
  },

  mail: (s) => {
    const r = cr(s, 3);
    const vee = s.geometryBias === "organic"
      ? `M2,5 Q12,15 22,5`
      : `M2,5 L12,12 L22,5`;
    return `<path d="${rr(2, 4, 20, 16, r)}"/><path d="${vee}" fill="none" stroke-width="${s.strokeWidth}"/>`;
  },

  phone: (s) => {
    return `<path d="M6.6,10.8 C7.4,12.4 8.8,13.8 10.4,14.6 L12.2,12.8 C12.6,12.4 13.2,12.2 13.6,12.4 C15,12.8 16.4,13 18,13 C18.8,13 19.4,13.6 19.4,14.4 L19.4,17.6 C19.4,18.4 18.8,19 18,19 C9.8,19 3.2,12.4 3.2,4.2 C3.2,3.4 3.8,2.8 4.6,2.8 L7.8,2.8 C8.6,2.8 9.2,3.4 9.2,4.2 C9.2,5.6 9.4,7 9.8,8.4 C10,8.8 9.8,9.4 9.4,9.8Z"/>`;
  },

  notification: (s) => {
    const organic = s.geometryBias === "organic";
    const bell = organic
      ? `M12,2 C8,2 5,5.1 5,9 L5,15 L3,17 L21,17 L19,15 L19,9 C19,5.1 16,2 12,2Z`
      : `M12,2 L7,9 L5,9 L5,15 L3,17 L21,17 L19,15 L19,9 L17,9Z`;
    return `<path d="${bell}"/><path d="M9,17 C9,18.7 10.3,20 12,20 C13.7,20 15,18.7 15,17" fill="none" stroke-width="${s.strokeWidth}"/>`;
  },

  broadcast: (s) => {
    const sw = s.strokeWidth;
    return `<circle cx="12" cy="13" r="2"/><path d="M8.5,9.5 C7.2,10.8 6.5,12 6.5,13.5 C6.5,15 7.2,16.3 8.5,17.5" fill="none" stroke-width="${sw}"/><path d="M15.5,9.5 C16.8,10.8 17.5,12 17.5,13.5 C17.5,15 16.8,16.3 15.5,17.5" fill="none" stroke-width="${sw}"/><path d="M5.5,6.5 C3.5,8.5 2.5,11 2.5,13.5 C2.5,16 3.5,18.5 5.5,20.5" fill="none" stroke-width="${sw}"/><path d="M18.5,6.5 C20.5,8.5 21.5,11 21.5,13.5 C21.5,16 20.5,18.5 18.5,20.5" fill="none" stroke-width="${sw}"/>`;
  },

  search: (s) => {
    return `<circle cx="11" cy="11" r="7.5" fill="none" stroke-width="${s.strokeWidth}"/><line x1="16.5" y1="16.5" x2="22" y2="22" stroke-width="${s.strokeWidth * 1.5}"/>`;
  },

  menu: (s) => {
    const lc = s.geometryBias === "organic" ? "round" : "square";
    return `<line x1="3" y1="6" x2="21" y2="6" stroke-linecap="${lc}" stroke-width="${s.strokeWidth}"/><line x1="3" y1="12" x2="21" y2="12" stroke-linecap="${lc}" stroke-width="${s.strokeWidth}"/><line x1="3" y1="18" x2="21" y2="18" stroke-linecap="${lc}" stroke-width="${s.strokeWidth}"/>`;
  },

  home: (s) => {
    const r = cr(s, 3);
    const roof = s.geometryBias === "organic"
      ? `M2,12 Q12,3 22,12`
      : `M2,12 L12,3 L22,12`;
    return `<path d="${roof}" fill="none" stroke-width="${s.strokeWidth}"/><path d="M5,11 L5,20 L10,20 L10,14 L14,14 L14,20 L19,20 L19,11Z"/><path d="${rr(10, 14, 4, 6, Math.min(r, 2))}" fill="none" stroke-width="${s.strokeWidth}"/>`;
  },

  arrow: (s) => {
    const organic = s.geometryBias === "organic";
    const shaft = organic
      ? `M3,12 Q10,10 19,12`
      : `M3,12 L19,12`;
    return `<path d="${shaft}" fill="none" stroke-width="${s.strokeWidth}"/><path d="M14,7 L21,12 L14,17" fill="none" stroke-width="${s.strokeWidth}"/>`;
  },

  compass: (s) => {
    return `<circle cx="12" cy="12" r="9" fill="none" stroke-width="${s.strokeWidth}"/><polygon points="12,5 14.2,9.8 12,9.2 9.8,9.8"/><polygon points="12,19 9.8,14.2 12,14.8 14.2,14.2"/>`;
  },

  settings: (s) => {
    const cx = 12, cy = 12;
    const outerR = 7.5, innerR = 4.5, toothN = 8;
    const teeth: string[] = [];
    for (let i = 0; i < toothN; i++) {
      const aIn = (i / toothN) * Math.PI * 2;
      const aOut1 = aIn - (Math.PI / toothN) * 0.45;
      const aOut2 = aIn + (Math.PI / toothN) * 0.45;
      const aNext = ((i + 1) / toothN) * Math.PI * 2 - (Math.PI / toothN) * 0.45;
      if (i === 0) {
        teeth.push(`M${(cx + innerR * Math.cos(aOut1)).toFixed(2)},${(cy + innerR * Math.sin(aOut1)).toFixed(2)}`);
      }
      teeth.push(`L${(cx + outerR * Math.cos(aOut1)).toFixed(2)},${(cy + outerR * Math.sin(aOut1)).toFixed(2)}`);
      teeth.push(`L${(cx + outerR * Math.cos(aOut2)).toFixed(2)},${(cy + outerR * Math.sin(aOut2)).toFixed(2)}`);
      teeth.push(`L${(cx + innerR * Math.cos(aOut2)).toFixed(2)},${(cy + innerR * Math.sin(aOut2)).toFixed(2)}`);
      teeth.push(`A${innerR},${innerR} 0 0,1 ${(cx + innerR * Math.cos(aNext)).toFixed(2)},${(cy + innerR * Math.sin(aNext)).toFixed(2)}`);
    }
    teeth.push("Z");
    return `<path d="${teeth.join(" ")}"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="none" stroke="currentColor" stroke-width="${s.strokeWidth}"/>`;
  },

  filter: (s) => {
    const organic = s.geometryBias === "organic";
    if (organic) {
      return `<path d="M3,4 C3,4 9,12 9,16 L9,21 L15,21 L15,16 C15,12 21,4 21,4Z"/><line x1="3" y1="4" x2="21" y2="4" stroke-width="${s.strokeWidth}"/>`;
    }
    return `<polygon points="3,4 21,4 15,13 15,21 9,21 9,13"/>`;
  },

  grid: (s) => {
    const r = cr(s, 3);
    return [rr(3, 3, 8, 8, r), rr(13, 3, 8, 8, r), rr(3, 13, 8, 8, r), rr(13, 13, 8, 8, r)]
      .map(d => `<path d="${d}"/>`).join("");
  },

  list: (s) => {
    const r = s.geometryBias === "organic" ? 1 : 0;
    const lc = r > 0 ? "round" : "square";
    return `<circle cx="5" cy="6" r="${1.2 + r * 0.3}"/><line x1="9" y1="6" x2="21" y2="6" stroke-linecap="${lc}" stroke-width="${s.strokeWidth}"/><circle cx="5" cy="12" r="${1.2 + r * 0.3}"/><line x1="9" y1="12" x2="21" y2="12" stroke-linecap="${lc}" stroke-width="${s.strokeWidth}"/><circle cx="5" cy="18" r="${1.2 + r * 0.3}"/><line x1="9" y1="18" x2="21" y2="18" stroke-linecap="${lc}" stroke-width="${s.strokeWidth}"/>`;
  },

  close: (s) => {
    const lc = s.geometryBias === "organic" ? "round" : "square";
    return `<line x1="4" y1="4" x2="20" y2="20" stroke-linecap="${lc}" stroke-width="${s.strokeWidth}"/><line x1="20" y1="4" x2="4" y2="20" stroke-linecap="${lc}" stroke-width="${s.strokeWidth}"/>`;
  },

  cart: (s) => {
    return `<path d="M1,1 L5,1 L7.7,14.3 C7.9,15.2 8.7,15.9 9.6,15.9 L19,15.9 C19.9,15.9 20.7,15.3 20.9,14.5 L22,9 L6,9" fill="none" stroke-width="${s.strokeWidth}"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>`;
  },

  tag: (s) => {
    return `<path d="M20.6,11.6 L12.4,3.4 C12,3 11.5,2.8 11,2.8 L5,2.8 C3.9,2.8 3,3.7 3,4.8 L3,10.8 C3,11.3 3.2,11.8 3.6,12.2 L11.8,20.4 C12.6,21.2 13.8,21.2 14.6,20.4 L20.6,14.4 C21.4,13.6 21.4,12.4 20.6,11.6Z"/><circle cx="7" cy="7" r="1.5" fill="${s.variant === "filled" ? "none" : "currentColor"}" stroke="${s.variant === "filled" ? "currentColor" : "none"}"/>`;
  },

  wallet: (s) => {
    const r = cr(s, 3);
    return `<path d="${rr(2, 7, 20, 14, r)}"/><path d="M2,11 L22,11" fill="none" stroke-width="${s.strokeWidth}"/><path d="${rr(15, 13, 5, 4, Math.min(r, 2))}"/><circle cx="17.5" cy="15" r="1" fill="${s.variant === "outline" ? "currentColor" : "none"}"/>`;
  },

  receipt: (s) => {
    const r = cr(s, 2);
    return `<path d="${rr(4, 2, 16, 20, r)}"/><line x1="8" y1="8" x2="16" y2="8" fill="none" stroke-width="${s.strokeWidth}"/><line x1="8" y1="12" x2="16" y2="12" fill="none" stroke-width="${s.strokeWidth}"/><line x1="8" y1="16" x2="13" y2="16" fill="none" stroke-width="${s.strokeWidth}"/>`;
  },

  package: (s) => {
    return `<path d="M3,7 L12,2 L21,7 L21,17 L12,22 L3,17Z"/><line x1="3" y1="7" x2="21" y2="7" fill="none" stroke-width="${s.strokeWidth}"/><line x1="12" y1="2" x2="12" y2="22" fill="none" stroke-width="${s.strokeWidth}"/>`;
  },

  play: (s) => {
    const r = cr(s, 8);
    if (r > 5) {
      return `<path d="M5,3.5 C5,2.9 5.6,2.5 6.1,2.8 L20.1,10.8 C20.6,11.1 20.6,11.9 20.1,12.2 L6.1,20.2 C5.6,20.5 5,20.1 5,19.5Z"/>`;
    }
    return `<polygon points="5,3 20,12 5,21"/>`;
  },

  image: (s) => {
    const r = cr(s, 4);
    return `<path d="${rr(2, 4, 20, 16, r)}"/><circle cx="8.5" cy="8.5" r="1.5" fill="${s.variant === "outline" ? "currentColor" : "none"}" stroke="${s.variant === "outline" ? "none" : "currentColor"}" stroke-width="${s.strokeWidth}"/><path d="M2,16 L8,11 L12,14 L16,10 L22,16" fill="none" stroke-width="${s.strokeWidth}"/>`;
  },

  video: (s) => {
    const r = cr(s, 3);
    const organic = s.geometryBias === "organic";
    const cam = organic
      ? `M16,8.5 Q17,7 18,8 L22,5 L22,19 L18,16 Q17,17 16,15.5Z`
      : `M16,7 L22,4 L22,20 L16,17Z`;
    return `<path d="${rr(2, 6, 14, 12, r)}"/><path d="${cam}"/>`;
  },

  music: (s) => {
    const organic = s.geometryBias === "organic";
    if (organic) {
      return `<path d="M9,18 C9,20.2 7,21.5 5,21.5 C3,21.5 2,20 2,18.5 C2,17 3,15.5 5,15.5 C6.5,15.5 8,16 9,18 L9,5 L20,3 L20,16 C20,18.2 18,19.5 16,19.5 C14,19.5 13,18 13,16.5 C13,15 14,13.5 16,13.5 C17.5,13.5 19,14 20,16" fill="none" stroke-linecap="round" stroke-width="${s.strokeWidth}"/>`;
    }
    return `<circle cx="5" cy="18" r="3" fill="none" stroke-width="${s.strokeWidth}"/><circle cx="16" cy="16" r="3" fill="none" stroke-width="${s.strokeWidth}"/><line x1="8" y1="18" x2="8" y2="4" stroke-width="${s.strokeWidth}"/><line x1="8" y1="4" x2="19" y2="2" stroke-width="${s.strokeWidth}"/><line x1="19" y1="2" x2="19" y2="16" stroke-width="${s.strokeWidth}"/>`;
  },

  microphone: (s) => {
    const r = cr(s, 8);
    return `<path d="${rr(8, 2, 8, 11, Math.min(r, 4))}"/><path d="M5,10 C5,15.5 19,15.5 19,10" fill="none" stroke-width="${s.strokeWidth}"/><line x1="12" y1="18" x2="12" y2="22" stroke-width="${s.strokeWidth}"/><line x1="8" y1="22" x2="16" y2="22" stroke-width="${s.strokeWidth}"/>`;
  },
};

export function renderIconSvgContent(name: IconName, style: GenomeIconStyle): string {
  const renderer = RENDERERS[name];
  if (!renderer) return "";
  return renderer(style);
}

export function buildSvgString(name: IconName, style: GenomeIconStyle, size = 24): string {
  const fill = style.variant === "filled" ? "currentColor" : "none";
  const lc = style.geometryBias === "organic" ? "round" : "square";
  const lj = style.geometryBias === "organic" ? "round" : "miter";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="currentColor" stroke-width="${style.strokeWidth}" stroke-linecap="${lc}" stroke-linejoin="${lj}">${renderIconSvgContent(name, style)}</svg>`;
}
