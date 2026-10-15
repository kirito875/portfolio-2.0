/**
 * Types and rules shared by the leaderboard client, the API route, and the
 * in-memory store. Deliberately free of `window` and of the "use client"
 * directive so the server can import it too.
 */

import {
  CLEAR_BONUS,
  LEVELS,
  MAX_SHOTS,
  MULTI_KNOCK_BONUS,
  PER_LEVEL,
  TOTAL_BLOCKS,
  UNUSED_BALL_BONUS,
  blockPoints,
} from "./score";

export type ScoreEntry = {
  id: string;
  name: string;
  score: number;
  shots: number;
  knocked: number;
  /** Unix ms — also the tie-breaker, so an earlier run wins a dead heat. */
  at: number;
};

/** What a client is allowed to send: identity and timestamp are server-side. */
export type RunPayload = Pick<ScoreEntry, "name" | "score" | "shots" | "knocked">;

/** How many rows the board shows. */
export const BOARD_SIZE = 5;

/** How many runs the store keeps, so older bests survive a busy period. */
export const STORE_LIMIT = 50;

export const MAX_NAME_LENGTH = 14;

/** Submissions allowed per IP inside the rolling window. */
export const RATE_WINDOW_MS = 10 * 60 * 1000;
export const RATE_LIMIT = 20;

/** Newest-and-best first; ties go to whoever got there first. */
export function byScoreThenTime(a: ScoreEntry, b: ScoreEntry): number {
  return b.score - a.score || a.at - b.at;
}

export function isScoreEntry(value: unknown): value is ScoreEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<ScoreEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.name === "string" &&
    typeof entry.score === "number" &&
    Number.isFinite(entry.score) &&
    typeof entry.shots === "number" &&
    typeof entry.knocked === "number" &&
    typeof entry.at === "number"
  );
}

/**
 * Trims a submitted name down to something safe to store and display. React
 * escapes on render, but the store is the right place to refuse rubbish.
 */
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== "string") return "Anonymous";
  const cleaned = raw
    .replace(/[\u0000-\u001f\u007f]/g, "") // control characters
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  return cleaned || "Anonymous";
}

/**
 * Every point value in the tower, biggest first. The tower is fixed, so this
 * list is known exactly — which lets us bound a legitimate score precisely
 * instead of guessing with a loose constant.
 */
const POINTS_DESCENDING: number[] = Array.from({ length: LEVELS }, (_, level) => blockPoints(level))
  .flatMap((points) => Array.from({ length: PER_LEVEL }, () => points))
  .sort((a, b) => b - a);

/**
 * The highest score a run with these totals could possibly have earned.
 *
 * Assumes the best case at every step: the toppled blocks were the most
 * valuable ones, every shot knocked at least one block down, and any unspent
 * balls and the clear bonus were collected.
 */
export function maxScoreFor(shots: number, knocked: number): number {
  const base = POINTS_DESCENDING.slice(0, Math.max(0, knocked)).reduce((sum, p) => sum + p, 0);
  const multi = MULTI_KNOCK_BONUS * Math.max(0, knocked - shots);
  const unused = UNUSED_BALL_BONUS * Math.max(0, MAX_SHOTS - shots);
  const clear = knocked >= TOTAL_BLOCKS ? CLEAR_BONUS : 0;
  return base + multi + unused + clear;
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

export type ValidationResult =
  | { ok: true; run: RunPayload }
  | { ok: false; error: string };

/** Rejects anything the game could not legitimately have produced. */
export function validateRun(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Expected a JSON object." };
  }

  const { name, score, shots, knocked } = body as Record<string, unknown>;

  if (!isWholeNumber(score) || score < 0) {
    return { ok: false, error: "Score must be a non-negative whole number." };
  }
  if (!isWholeNumber(shots) || shots < 0 || shots > MAX_SHOTS) {
    return { ok: false, error: `Shots must be a whole number from 0 to ${MAX_SHOTS}.` };
  }
  if (!isWholeNumber(knocked) || knocked < 0 || knocked > TOTAL_BLOCKS) {
    return { ok: false, error: `Blocks down must be a whole number from 0 to ${TOTAL_BLOCKS}.` };
  }

  const ceiling = maxScoreFor(shots, knocked);
  if (score > ceiling) {
    return { ok: false, error: `Score ${score} is impossible for that run (max ${ceiling}).` };
  }

  return { ok: true, run: { name: sanitizeName(name), score, shots, knocked } };
}

export function makeEntry(run: RunPayload, now: number = Date.now()): ScoreEntry {
  return {
    ...run,
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: now,
  };
}

/** Adds a run and keeps only the best `limit` rows. */
export function insertIntoBoard(
  entries: ScoreEntry[],
  entry: ScoreEntry,
  limit: number = STORE_LIMIT,
): ScoreEntry[] {
  return [...entries, entry].sort(byScoreThenTime).slice(0, limit);
}
