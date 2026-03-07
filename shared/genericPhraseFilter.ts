const BANNED_PHRASES: string[] = [
  "build something remarkable",
  "build something incredible",
  "build something amazing",
  "build something extraordinary",
  "technology solutions for tomorrow",
  "start building today",
  "the platform your team has been waiting for",
  "the future of technology",
  "your one-stop solution",
  "take your business to the next level",
  "unleash the power of",
  "unlock your potential",
  "revolutionize the way you",
  "all-in-one platform",
  "cutting-edge technology solutions",
  "digital transformation made easy",
  "supercharge your workflow",
  "empower your team",
  "designed for the modern world",
  "built for the future",
  "seamless experience for everyone",
  "streamline your operations",
  "next-generation platform",
  "world-class solutions",
  "innovative solutions for modern businesses",
  "everything you need in one place",
  "transform your digital presence",
  "the smart way to manage",
  "your success starts here",
  "join thousands of satisfied customers",
  "trusted by millions worldwide",
  "solutions that scale with you",
  "built for teams that move fast",
  "enterprise-ready solutions",
  "get started in minutes",
  "no credit card required",
  "loved by teams everywhere",
  "the platform that grows with you",
];

const BANNED_PATTERNS: RegExp[] = [
  /build something (?:remarkable|incredible|amazing|extraordinary)/i,
  /your (?:one-stop|all-in-one|go-to) (?:solution|platform)/i,
  /(?:unleash|unlock|harness) the (?:power|potential|magic)/i,
  /take .{0,20} to the next level/i,
  /everything you need/i,
  /designed for the (?:modern|digital|future)/i,
  /the (?:smart|easy|simple) way to/i,
  /revolutionize the way/i,
  /supercharge your/i,
  /no credit card/i,
  /loved by (?:teams|companies|businesses) (?:everywhere|worldwide)/i,
];

export function containsBannedPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  if (BANNED_PHRASES.some(p => lower.includes(p))) return true;
  if (BANNED_PATTERNS.some(p => p.test(text))) return true;
  return false;
}

export function filterBannedPhrases(text: string): string {
  let result = text;
  for (const phrase of BANNED_PHRASES) {
    const idx = result.toLowerCase().indexOf(phrase);
    if (idx !== -1) {
      result = result.slice(0, idx) + result.slice(idx + phrase.length);
    }
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

export function isGenericHeadline(text: string): boolean {
  if (containsBannedPhrase(text)) return true;
  const lower = text.toLowerCase();
  const genericStarts = [
    "welcome to",
    "introducing the future",
    "your partner in",
    "the future is here",
    "innovation starts here",
    "discover the power",
  ];
  return genericStarts.some(s => lower.startsWith(s));
}
