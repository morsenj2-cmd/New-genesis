import { getDatasetStats, getRecentExamples } from "./learningDataset";

export interface TrainingJob {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  triggeredAt: number;
  completedAt?: number;
  newExamplesCount: number;
  previousVersion: string;
  newVersion?: string;
  error?: string;
}

const RETRAIN_THRESHOLD = 50;
const MIN_RETRAIN_INTERVAL_MS = 30 * 60 * 1000;

let _lastRetrainTimestamp = 0;
let _promptsSinceLastTrain = 0;
let _retrainingCallbacks: Array<() => Promise<void>> = [];
const _trainingHistory: TrainingJob[] = [];

export function recordPrompt(): void {
  _promptsSinceLastTrain++;
}

export function shouldRetrain(): boolean {
  const now = Date.now();
  const timeSinceLast = now - _lastRetrainTimestamp;

  if (timeSinceLast < MIN_RETRAIN_INTERVAL_MS) return false;
  if (_promptsSinceLastTrain < RETRAIN_THRESHOLD) return false;

  return true;
}

export function onRetrain(callback: () => Promise<void>): void {
  _retrainingCallbacks.push(callback);
}

export async function triggerRetrainIfNeeded(): Promise<boolean> {
  if (!shouldRetrain()) return false;

  const jobId = `retrain-${Date.now()}`;
  const job: TrainingJob = {
    id: jobId,
    status: "running",
    triggeredAt: Date.now(),
    newExamplesCount: _promptsSinceLastTrain,
    previousVersion: getLastVersion(),
  };
  _trainingHistory.push(job);

  try {
    for (const cb of _retrainingCallbacks) {
      await cb();
    }

    job.status = "completed";
    job.completedAt = Date.now();
    job.newVersion = `v${_trainingHistory.length}`;
    _lastRetrainTimestamp = Date.now();
    _promptsSinceLastTrain = 0;
    return true;
  } catch (err) {
    job.status = "failed";
    job.error = err instanceof Error ? err.message : "Unknown error";
    return false;
  }
}

export function getTrainingHistory(): TrainingJob[] {
  return [..._trainingHistory];
}

export function getQueueStatus(): {
  promptsSinceLastTrain: number;
  threshold: number;
  lastRetrainAt: number;
  readyToRetrain: boolean;
} {
  return {
    promptsSinceLastTrain: _promptsSinceLastTrain,
    threshold: RETRAIN_THRESHOLD,
    lastRetrainAt: _lastRetrainTimestamp,
    readyToRetrain: shouldRetrain(),
  };
}

function getLastVersion(): string {
  const last = _trainingHistory.filter(j => j.status === "completed").pop();
  return last?.newVersion ?? "v0";
}
