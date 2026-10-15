/**
 * The leaderboard store.
 *
 * Two backends, picked at runtime:
 *
 *   - **Netlify Blobs** when running on Netlify. Netlify injects the credentials
 *     into functions automatically, so there is no account, no key and nothing
 *     to configure. The store is site-wide, so scores survive redeploys.
 *   - **Process memory** during local development (`next dev`), where there is
 *     no Blobs context. Resets whenever the server restarts, which is what you
 *     want locally.
 *
 * Note the memory backend is also what a serverless host would fall back to if
 * Blobs were unavailable, and in that situation each instance would keep its own
 * board. That is why the deployment matters and why this is logged loudly.
 *
 * The client has one more fallback: if this API is unreachable it keeps the
 * board in localStorage, so the game keeps working and says so.
 *
 * Swapping in a different database means rewriting only this file.
 */

import { getStore, type Store } from "@netlify/blobs";
import {
  BOARD_SIZE,
  RATE_LIMIT,
  RATE_WINDOW_MS,
  STORE_LIMIT,
  byScoreThenTime,
  insertIntoBoard,
  isScoreEntry,
  makeEntry,
  type RunPayload,
  type ScoreEntry,
} from "./board";

/** Site-wide store, so the board outlives individual deploys. */
const STORE_NAME = "tower-scores";

/** The whole board lives in one blob: one read and one write per operation. */
const BOARD_KEY = "board";

type Memory = {
  entries: ScoreEntry[];
  submissions: Map<string, number[]>;
};

type Backend = { kind: "blobs"; store: Store } | { kind: "memory" };

/**
 * Cached on globalThis so Next.js hot reloads during development don't silently
 * empty the board on every file save.
 */
const globals = globalThis as typeof globalThis & {
  __towerMemory?: Memory;
  __towerBackend?: Backend;
};

function memory(): Memory {
  globals.__towerMemory ??= { entries: [], submissions: new Map() };
  return globals.__towerMemory;
}

/**
 * Resolves the backend once per server instance.
 *
 * `getStore` must be called while handling a request, never at module scope, so
 * this is lazy. It throws when no Blobs context is present, which is exactly how
 * local development is detected.
 */
function backend(): Backend {
  if (globals.__towerBackend) return globals.__towerBackend;

  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    globals.__towerBackend = { kind: "blobs", store };
    console.info("[tower] Leaderboard backed by Netlify Blobs.");
  } catch {
    globals.__towerBackend = { kind: "memory" };
    console.warn(
      "[tower] Netlify Blobs is unavailable, so the leaderboard is held in memory " +
        "and resets when this server restarts. Expected during local `next dev`; " +
        "if you see this on Netlify, the site is not running on the Next.js runtime.",
    );
  }

  return globals.__towerBackend;
}

async function readBoard(): Promise<ScoreEntry[]> {
  const resolved = backend();

  if (resolved.kind === "memory") return memory().entries;

  const raw: unknown = await resolved.store.get(BOARD_KEY, { type: "json" });
  if (!Array.isArray(raw)) return [];

  // The blob is ours, but never trust storage blindly — entries may predate a
  // schema change.
  return raw.filter(isScoreEntry).sort(byScoreThenTime).slice(0, STORE_LIMIT);
}

async function writeBoard(entries: ScoreEntry[]): Promise<void> {
  const resolved = backend();

  if (resolved.kind === "memory") {
    memory().entries = entries;
    return;
  }

  await resolved.store.setJSON(BOARD_KEY, entries);
}

export async function topScores(limit: number = BOARD_SIZE): Promise<ScoreEntry[]> {
  return (await readBoard()).slice(0, limit);
}

export async function addScore(
  run: RunPayload,
  now: number = Date.now(),
): Promise<{ entry: ScoreEntry; rank: number; entries: ScoreEntry[] }> {
  const entry = makeEntry(run, now);

  // Read-modify-write on one blob. Two submissions landing in the same instant
  // could lose one of them; for a portfolio leaderboard that trade is worth a
  // single round trip. A sorted set (Redis) removes the race entirely.
  const updated = insertIntoBoard(await readBoard(), entry, STORE_LIMIT);
  await writeBoard(updated);

  const board = updated.slice(0, BOARD_SIZE);
  return { entry, rank: board.findIndex((row) => row.id === entry.id), entries: board };
}

/**
 * Sliding-window rate limit per request key.
 *
 * Best-effort and deliberately in memory: it is a speed bump, not security.
 * With no login, a determined player can still forge a plausible score.
 */
export function isRateLimited(key: string, now: number = Date.now()): boolean {
  const state = memory();

  // Keep the map from growing without bound as different clients show up.
  if (state.submissions.size > 1000) {
    for (const [existingKey, times] of state.submissions) {
      if (times.every((time) => now - time >= RATE_WINDOW_MS)) {
        state.submissions.delete(existingKey);
      }
    }
  }

  const recent = (state.submissions.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    state.submissions.set(key, recent);
    return true;
  }

  recent.push(now);
  state.submissions.set(key, recent);
  return false;
}
