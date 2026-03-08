const MEDIA_SIGNALS: string[] = [
  "hero image", "add image", "add images", "with image", "with images",
  "include image", "include images", "show image", "show images",
  "add a photo", "add photos", "with photos", "show photos", "include photos",
  "product screenshot", "app screenshot", "ui screenshot",
  "product mockup", "add mockup", "include mockup",
  "add illustration", "show illustration", "include illustration", "with illustration",
  "photo gallery", "image gallery",
  "hero video", "add video", "include video", "show video",
  "add artwork", "include artwork",
  "background image", "banner image", "featured image",
  "upload image", "upload photo",
];

const MEDIA_ANTI_SIGNALS: string[] = [
  "data visualization", "visual hierarchy", "visual components",
  "visual design", "visual style", "visual cue", "visual feedback",
  "visual indicator", "media player", "media streaming",
  "graphic design", "graphic element",
];

export function detectMediaIntent(prompt: string): boolean {
  const lower = prompt.toLowerCase();

  for (const anti of MEDIA_ANTI_SIGNALS) {
    if (lower.includes(anti)) {
      const withoutAnti = lower.replace(new RegExp(anti.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
      if (!MEDIA_SIGNALS.some(signal => withoutAnti.includes(signal))) {
        return false;
      }
    }
  }

  return MEDIA_SIGNALS.some(signal => lower.includes(signal));
}

export function stripMediaPlacements<T extends { sections: Array<{ imagePlacement?: string; [key: string]: any }>; metadata: any }>(layout: T): T {
  return {
    ...layout,
    sections: layout.sections.map(s => ({ ...s, imagePlacement: "none" })),
    metadata: { ...layout.metadata, hasMedia: false },
  };
}
