const MEDIA_SIGNALS: string[] = [
  "hero image", "add image", "add images", "with image", "with images",
  "include image", "include images", "show image", "show images",
  "add a photo", "add photos", "with photos", "show photos", "include photos",
  "product screenshot", "app screenshot", "ui screenshot", "screenshots",
  "dashboard preview", "app preview", "ui preview", "show preview",
  "product mockup", "mockup", "mockups",
  "illustration", "illustrations", "add illustration", "show illustration",
  "photo gallery", "gallery",
  "hero video", "add video", "include video", "show video",
  "visual", "visuals", "media", "artwork", "graphic", "graphics",
];

export function detectMediaIntent(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return MEDIA_SIGNALS.some(signal => lower.includes(signal));
}

export function stripMediaPlacements<T extends { sections: Array<{ imagePlacement?: string; [key: string]: any }>; metadata: any }>(layout: T): T {
  return {
    ...layout,
    sections: layout.sections.map(s => ({ ...s, imagePlacement: "none" })),
    metadata: { ...layout.metadata, hasMedia: false },
  };
}
