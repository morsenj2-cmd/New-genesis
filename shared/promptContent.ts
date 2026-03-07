// Extracts the product/brand name from a free-form prompt.
// Looks for proper nouns in common patterns like "X is a...", "Build X", etc.
export function extractProductName(text: string): string | null {
  const trimmed = text.trim();

  // Pattern 1: "ProductName is a..." / "ProductName — a..."
  const isA = trimmed.match(/^([A-Z][a-zA-Z0-9]*(?:\s[A-Z][a-zA-Z0-9]*)?)\s+(?:is|are)\b/);
  if (isA && isA[1] && !GENERIC_STARTERS.has(isA[1].toLowerCase())) {
    return isA[1];
  }

  // Pattern 2: "ProductName: description"
  const colon = trimmed.match(/^([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)?)\s*:/);
  if (colon && colon[1] && !GENERIC_STARTERS.has(colon[1].toLowerCase())) {
    return colon[1];
  }

  // Pattern 3: "Build/Create/Launch ProductName" where it's a capitalized proper noun
  const buildMatch = trimmed.match(/\b(?:build|create|launch|develop|design|introducing)\s+([A-Z][a-zA-Z0-9]+(?:\s[A-Z][a-zA-Z0-9]+)?)\b/);
  if (buildMatch && buildMatch[1] && !GENERIC_STARTERS.has(buildMatch[1].toLowerCase())) {
    return buildMatch[1];
  }

  // Pattern 4: "called 'ProductName'" or 'named "ProductName"'
  const calledMatch = trimmed.match(/\b(?:called|named)\s+["']?([A-Z][a-zA-Z0-9]+)["']?/i);
  if (calledMatch) return calledMatch[1];

  return null;
}

// Common words that look like proper nouns but aren't product names
const GENERIC_STARTERS = new Set([
  "create", "build", "make", "design", "generate", "this", "our", "your",
  "a", "an", "the", "i", "we", "my", "it", "he", "she", "they", "you",
  "please", "need", "want", "would", "could", "should",
  "saas", "app", "website", "platform", "service", "tool", "dashboard",
]);

// ── Prompt-based headline / subheadline generator ────────────────────────────

interface PromptContentResult {
  headline: string;
  subheadline: string;
  ctaLabel: string;
}

// Product-type frames: verb + default noun
const PRODUCT_FRAMES: Record<string, { verb: string; noun: string; cta: string }> = {
  cloud_storage:       { verb: "Store",    noun: "your files securely",          cta: "Start storing free" },
  chat_app:            { verb: "Connect",  noun: "your entire team",             cta: "Start chatting free" },
  analytics_dashboard: { verb: "Analyze",  noun: "your data in real time",       cta: "Explore your data" },
  ecommerce:           { verb: "Sell",     noun: "your products online",         cta: "Open your store" },
  project_management:  { verb: "Manage",   noun: "projects with clarity",        cta: "Start managing free" },
  crm:                 { verb: "Manage",   noun: "customer relationships",       cta: "Get started free" },
  social_media:        { verb: "Build",    noun: "your community",               cta: "Join the network" },
  saas_generic:        { verb: "Build",    noun: "something remarkable",         cta: "Get started free" },
  developer_tool:      { verb: "Build",    noun: "faster with the right tools",  cta: "Start building free" },
  video_platform:      { verb: "Share",    noun: "your content with the world",  cta: "Start uploading" },
  fintech:             { verb: "Manage",   noun: "your finances smarter",        cta: "Get started free" },
  healthcare:          { verb: "Improve",  noun: "patient care and outcomes",    cta: "Learn more" },
  education:           { verb: "Learn",    noun: "at your own pace",             cta: "Start learning free" },
  calendar_scheduling: { verb: "Schedule", noun: "smarter, stress-free",         cta: "Book a demo" },
};

const DEFAULT_FRAME = { verb: "Build", noun: "something incredible", cta: "Get started free" };

// Extracts "for X" audience from prompt (e.g., "for remote teams", "for government agencies")
function extractAudience(text: string): string | null {
  const lower = text.toLowerCase();
  const m = lower.match(/for\s+((?:(?!to\s|that\s|which\s|who\s)[^\.,])+)/);
  return m ? trim80(capitalize(m[1].trim())) : null;
}

// Extracts "that [verb]s [noun]" feature phrase
function extractFeaturePhrase(text: string): string | null {
  const lower = text.toLowerCase();
  const m = lower.match(/that\s+((?:(?!,|\.)[^,\.])+)/);
  return m ? trim80(capitalize(m[1].trim())) : null;
}

// Extracts key descriptors (adjectives before the main noun)
function extractDescriptors(text: string): string {
  const ADJECTIVES = ["secure", "fast", "smart", "powerful", "simple", "modern", "easy", "professional", "enterprise", "lightweight", "realtime", "real-time", "collaborative", "open source", "open-source", "private", "encrypted"];
  const lower = text.toLowerCase();
  const found = ADJECTIVES.filter(a => lower.includes(a));
  return found.slice(0, 2).join(", ");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function trim80(s: string): string {
  return s.length > 80 ? s.slice(0, 77) + "…" : s;
}

export function generatePromptContent(
  prompt: string,
  productType: string | null,
  productName: string | null,
): PromptContentResult {
  const frame = PRODUCT_FRAMES[productType ?? ""] ?? DEFAULT_FRAME;
  const audience = extractAudience(prompt);
  const feature = extractFeaturePhrase(prompt);
  const descriptors = extractDescriptors(prompt);

  const brandPrefix = productName ? `${productName} — ` : "";

  let headline: string;
  let subheadline: string;

  if (audience) {
    // "Manage projects for remote teams" / "Store files securely for government agencies"
    const adjectivePrefix = descriptors ? `${capitalize(descriptors)} ` : "";
    headline = trim80(`${brandPrefix}${adjectivePrefix}${frame.verb.toLowerCase()} ${frame.noun} for ${audience}`);
    headline = capitalize(headline);
    if (feature) {
      subheadline = trim80(`${capitalize(feature)}. Built specifically for ${audience}.`);
    } else {
      subheadline = `The platform designed specifically for ${audience}. Get started in minutes.`;
    }
  } else if (feature) {
    // "Store sensitive government documents"
    headline = trim80(`${brandPrefix}${capitalize(feature)}`);
    headline = capitalize(headline);
    subheadline = `A powerful ${(productType ?? "platform").replace(/_/g, " ")} built for teams that move fast.`;
  } else {
    // Generic fallback using productType frame
    const adjectivePrefix = descriptors ? `${capitalize(descriptors)} ` : "";
    headline = trim80(`${brandPrefix}${adjectivePrefix}${frame.verb} ${frame.noun}`);
    headline = capitalize(headline);
    subheadline = `The modern platform for every workflow. Get started in minutes.`;
  }

  const ctaLabel = productName
    ? `Get started with ${productName}`
    : frame.cta;

  return {
    headline: trim80(headline),
    subheadline: trim80(subheadline),
    ctaLabel: ctaLabel.length > 40 ? frame.cta : ctaLabel,
  };
}
