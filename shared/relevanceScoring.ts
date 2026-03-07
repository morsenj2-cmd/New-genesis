import { getAllDomainWords, getDomainVocabulary } from "./domainVocabulary";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "can", "could", "must", "need",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
  "they", "them", "their", "its", "this", "that", "these", "those",
  "of", "in", "to", "for", "with", "on", "at", "by", "from", "as",
  "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "over", "about", "up", "down", "out", "off",
  "and", "but", "or", "nor", "not", "no", "so", "if", "than", "too",
  "very", "just", "also", "only", "then", "now", "here", "there",
  "when", "where", "how", "what", "which", "who", "whom", "why",
  "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "any", "many", "much", "own",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

export function scoreRelevance(
  sentence: string,
  industry: string,
  promptKeywords: string[],
): number {
  const words = tokenize(sentence);
  if (words.length === 0) return 0;

  const domainWords = getAllDomainWords(industry);
  const promptSet = new Set(promptKeywords.map(k => k.toLowerCase()));

  let domainHits = 0;
  let promptHits = 0;

  for (const word of words) {
    if (domainWords.has(word)) domainHits++;
    if (promptSet.has(word)) promptHits++;
  }

  const domainScore = domainHits / words.length;
  const promptScore = promptHits / words.length;

  return Math.min(1, domainScore * 0.6 + promptScore * 0.4 + (domainHits > 0 ? 0.15 : 0) + (promptHits > 0 ? 0.15 : 0));
}

export function extractPromptKeywords(prompt: string): string[] {
  const tokens = tokenize(prompt);
  const meaningful = tokens.filter(t => !STOP_WORDS.has(t) && t.length > 2);
  return [...new Set(meaningful)];
}

export function scoreSentenceBatch(
  sentences: string[],
  industry: string,
  promptKeywords: string[],
  threshold = 0.4,
): { sentence: string; score: number; passes: boolean }[] {
  return sentences.map(s => {
    const score = scoreRelevance(s, industry, promptKeywords);
    return { sentence: s, score, passes: score >= threshold };
  });
}

export function pickMostRelevant(
  candidates: string[],
  industry: string,
  promptKeywords: string[],
): string {
  if (candidates.length === 0) return "";
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < candidates.length; i++) {
    const score = scoreRelevance(candidates[i], industry, promptKeywords);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return candidates[bestIdx];
}
