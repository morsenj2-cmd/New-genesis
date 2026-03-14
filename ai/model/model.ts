import type { IntentType } from "./promptSchema";

export const EMBEDDING_DIM = 64;
export const NUM_ATTENTION_HEADS = 4;
export const HEAD_DIM = EMBEDDING_DIM / NUM_ATTENTION_HEADS;

const CONCEPT_DIMS = [
  "action", "style", "color", "layout", "typography",
  "spacing", "brand", "content", "industry", "product",
  "size", "density", "radius", "animation", "media", "context",
] as const;
type ConceptDim = (typeof CONCEPT_DIMS)[number];

type VocabEntry = Partial<Record<ConceptDim, number>>;

const DESIGN_VOCABULARY: Record<string, VocabEntry> = {
  make:       { action: 0.9 },
  change:     { action: 0.85 },
  update:     { action: 0.8 },
  set:        { action: 0.75 },
  switch:     { action: 0.8 },
  add:        { action: 0.9 },
  remove:     { action: 0.85 },
  delete:     { action: 0.85 },
  rename:     { action: 0.7, brand: 0.6 },
  regenerate: { action: 0.9 },
  refresh:    { action: 0.7 },
  redesign:   { action: 0.8 },
  build:      { action: 0.85, industry: 0.3 },
  create:     { action: 0.9 },
  generate:   { action: 0.8 },
  minimal:    { style: 0.95, density: -0.6, spacing: 0.5 },
  minimalist: { style: 0.95, density: -0.7, spacing: 0.5 },
  clean:      { style: 0.85, density: -0.5 },
  simple:     { style: 0.8, density: -0.5 },
  flat:       { style: 0.75, radius: -0.3, animation: -0.4 },
  bold:       { style: 0.7, typography: 0.6 },
  vibrant:    { style: 0.7, color: 0.7 },
  colorful:   { style: 0.65, color: 0.8 },
  muted:      { style: 0.6, color: -0.5 },
  subtle:     { style: 0.6, color: -0.4 },
  dark:       { style: 0.5, color: 0.7 },
  light:      { style: 0.5, color: 0.6 },
  bright:     { style: 0.5, color: 0.75 },
  modern:     { style: 0.75 },
  classic:    { style: 0.6 },
  elegant:    { style: 0.8, spacing: 0.4 },
  playful:    { style: 0.75, animation: 0.4, radius: 0.5 },
  professional:{ style: 0.8, density: 0.3 },
  corporate:  { style: 0.75, industry: 0.5 },
  luxury:     { style: 0.8, spacing: 0.6 },
  techy:      { style: 0.6, industry: 0.5 },
  blue:       { color: 0.95 },
  red:        { color: 0.95 },
  green:      { color: 0.95 },
  purple:     { color: 0.9 },
  orange:     { color: 0.9 },
  yellow:     { color: 0.85 },
  pink:       { color: 0.85 },
  teal:       { color: 0.8 },
  indigo:     { color: 0.8 },
  cyan:       { color: 0.75 },
  gray:       { color: 0.7 },
  black:      { color: 0.7, style: 0.4 },
  white:      { color: 0.7, style: 0.4 },
  palette:    { color: 0.8 },
  hue:        { color: 0.85 },
  shade:      { color: 0.8 },
  gradient:   { color: 0.7, animation: 0.3 },
  primary:    { color: 0.6 },
  accent:     { color: 0.65 },
  font:       { typography: 0.95 },
  typeface:   { typography: 0.9 },
  heading:    { typography: 0.8, content: 0.4 },
  body:       { typography: 0.7 },
  weight:     { typography: 0.75 },
  serif:      { typography: 0.8 },
  sans:       { typography: 0.8 },
  mono:       { typography: 0.7 },
  layout:     { layout: 0.95 },
  grid:       { layout: 0.85 },
  section:    { layout: 0.8 },
  column:     { layout: 0.8 },
  hero:       { layout: 0.75, content: 0.3 },
  footer:     { layout: 0.7 },
  navbar:     { layout: 0.75 },
  sidebar:    { layout: 0.7 },
  card:       { layout: 0.6, content: 0.3 },
  spacing:    { spacing: 0.95 },
  padding:    { spacing: 0.9 },
  margin:     { spacing: 0.85 },
  gap:        { spacing: 0.8 },
  compact:    { spacing: -0.7, density: 0.7 },
  dense:      { density: 0.8, spacing: -0.5 },
  airy:       { spacing: 0.8, density: -0.5 },
  spacious:   { spacing: 0.85, density: -0.6 },
  tight:      { spacing: -0.6, density: 0.6 },
  radius:     { radius: 0.9 },
  rounded:    { radius: 0.85 },
  sharp:      { radius: -0.7 },
  corner:     { radius: 0.75 },
  pill:       { radius: 0.9 },
  brand:      { brand: 0.95 },
  logo:       { brand: 0.85, media: 0.4 },
  name:       { brand: 0.7, content: 0.4 },
  company:    { brand: 0.6, industry: 0.4 },
  startup:    { brand: 0.5, industry: 0.7, product: 0.5 },
  headline:   { content: 0.9 },
  tagline:    { content: 0.85 },
  cta:        { content: 0.8 },
  button:     { content: 0.6, layout: 0.3 },
  copy:       { content: 0.7 },
  text:       { content: 0.7, typography: 0.3 },
  description:{ content: 0.75 },
  saas:       { industry: 0.9, product: 0.7 },
  ecommerce:  { industry: 0.85, product: 0.6 },
  restaurant: { industry: 0.9 },
  healthcare: { industry: 0.9 },
  fintech:    { industry: 0.85 },
  analytics:  { industry: 0.6, product: 0.7 },
  platform:   { product: 0.8, industry: 0.3 },
  dashboard:  { product: 0.85, layout: 0.4 },
  application:{ product: 0.7 },
  tool:       { product: 0.6 },
  portfolio:  { product: 0.8, industry: 0.4 },
  blog:       { product: 0.75 },
  shop:       { product: 0.8, industry: 0.5 },
  store:      { product: 0.8, industry: 0.5 },
  bigger:     { size: 0.8 },
  smaller:    { size: -0.8 },
  larger:     { size: 0.8 },
  increase:   { size: 0.6, action: 0.5 },
  decrease:   { size: -0.6, action: 0.5 },
  more:       { size: 0.5, density: 0.3 },
  less:       { size: -0.5, density: -0.3 },
  animation:  { animation: 0.9 },
  transition: { animation: 0.85 },
  hover:      { animation: 0.75 },
  image:      { media: 0.9 },
  photo:      { media: 0.85 },
  illustration:{ media: 0.8 },
  visual:     { media: 0.75 },
  correct:    { context: 0.8, action: 0.5 },
  fix:        { context: 0.7, action: 0.6 },
  wrong:      { context: 0.75 },
  actually:   { context: 0.8 },
  not:        { context: 0.6 },
};

function fnv1a(str: string, seed: number = 0x811c9dc5): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function embedToken(token: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  const entry = DESIGN_VOCABULARY[token] ?? DESIGN_VOCABULARY[token + "s"] ?? null;

  for (let d = 0; d < EMBEDDING_DIM; d++) {
    const h = fnv1a(token, 0x811c9dc5 ^ (d * 0x9e3779b9));
    vec[d] = ((h / 0xffffffff) * 2 - 1) * 0.1;
  }

  if (entry) {
    CONCEPT_DIMS.forEach((dim, ci) => {
      const score = (entry as Record<string, number>)[dim] ?? 0;
      if (score === 0) return;
      const base = ci * 4;
      vec[base] += score * 0.8;
      vec[base + 1] += score * 0.6;
      vec[base + 2] += (fnv1a(token, base + 2) / 0xffffffff * 2 - 1) * 0.1 * score;
      vec[base + 3] += (fnv1a(token, base + 3) / 0xffffffff * 2 - 1) * 0.1 * score;
    });
  }

  return Array.from(vec);
}

export function meanPool(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return new Array(EMBEDDING_DIM).fill(0);
  const result = new Array(EMBEDDING_DIM).fill(0);
  for (const e of embeddings) {
    for (let i = 0; i < EMBEDDING_DIM; i++) result[i] += e[i];
  }
  const n = embeddings.length;
  return result.map(v => v / n);
}

export function attentionPool(
  queryVec: number[],
  tokenEmbeddings: number[][],
  tokenWeights?: number[],
): number[] {
  if (tokenEmbeddings.length === 0) return new Array(EMBEDDING_DIM).fill(0);

  const scores = tokenEmbeddings.map((e, i) => {
    let dot = 0;
    for (let d = 0; d < EMBEDDING_DIM; d++) dot += queryVec[d] * e[d];
    const base = dot / Math.sqrt(EMBEDDING_DIM);
    return base + (tokenWeights ? tokenWeights[i] * 0.2 : 0);
  });

  const maxScore = Math.max(...scores);
  const expScores = scores.map(s => Math.exp(s - maxScore));
  const sumExp = expScores.reduce((a, b) => a + b, 0);
  const attnWeights = expScores.map(s => s / sumExp);

  const attended = new Array(EMBEDDING_DIM).fill(0);
  for (let t = 0; t < tokenEmbeddings.length; t++) {
    for (let d = 0; d < EMBEDDING_DIM; d++) {
      attended[d] += attnWeights[t] * tokenEmbeddings[t][d];
    }
  }
  return attended;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom < 1e-8 ? 0 : dot / denom;
}

export function classifyIntent(
  representationVec: number[],
  prototypes: Record<string, number[]>,
): Array<{ intentType: IntentType; score: number }> {
  const scores = Object.entries(prototypes).map(([intentType, proto]) => ({
    intentType: intentType as IntentType,
    score: cosineSimilarity(representationVec, proto),
  }));
  return scores.sort((a, b) => b.score - a.score);
}

export function getConceptScores(vec: number[]): Record<ConceptDim, number> {
  const result: Partial<Record<ConceptDim, number>> = {};
  CONCEPT_DIMS.forEach((dim, ci) => {
    const base = ci * 4;
    const score = (vec[base] + vec[base + 1]) / 2;
    result[dim] = score;
  });
  return result as Record<ConceptDim, number>;
}
