export function promptScaleFactor(promptLength: number): number {
  if (promptLength <= 500) return 1;
  if (promptLength <= 2000) return 1.5;
  if (promptLength <= 5000) return 2;
  if (promptLength <= 10000) return 2.5;
  if (promptLength <= 20000) return 3;
  return 4;
}

export function scaledCap(base: number, promptLength: number): number {
  return Math.round(base * promptScaleFactor(promptLength));
}
