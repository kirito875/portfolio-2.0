"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BOARD_SIZE,
  STORE_LIMIT,
  insertIntoBoard,
  isScoreEntry,
  makeEntry,
  type RunPayload,
  type ScoreEntry,
} from "./board";

export type { ScoreEntry, RunPayload };

const SCORES_KEY = "tower.scores.v1";
const NAME_KEY = "tower.player.v1";

export function loadPlayerName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePlayerName(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    /* storage blocked (private mode, quota) — not worth interrupting play */
  }
}

/** The offline mirror of the board, used only when the API cannot be reached. */
function readLocal(): ScoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isScoreEntry).sort((a, b) => b.score - a.score || a.at - b.at);
  } catch {
    return [];
  }
}

function writeLocal(entries: ScoreEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SCORES_KEY, JSON.stringify(entries));
  } catch {
    /* out of space or blocked — the board still shows in memory */
  }
}

/**
 * The shared top-5 board.
 *
 * Reads and writes go to /api/scores so every visitor competes on one board. If
 * that request fails — the host has no route handlers, the server is down, the
 * player is offline — the hook falls back to this browser's own history and
 * reports `offline`, so the game keeps working and the UI can say so.
 */
export function useLeaderboard() {
  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/scores", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: unknown = await response.json();
      const list = (data as { entries?: unknown } | null)?.entries;
      setEntries(Array.isArray(list) ? list.filter(isScoreEntry) : []);
      setOffline(false);
    } catch {
      setEntries(readLocal().slice(0, BOARD_SIZE));
      setOffline(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(async (run: RunPayload) => {
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(run),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = (await response.json()) as {
        entry: ScoreEntry;
        rank: number;
        entries?: unknown;
      };

      setEntries(Array.isArray(data.entries) ? data.entries.filter(isScoreEntry) : []);
      setOffline(false);
      return { entry: data.entry, rank: data.rank, offline: false };
    } catch {
      const entry = makeEntry(run);
      const kept = insertIntoBoard(readLocal(), entry, STORE_LIMIT);
      writeLocal(kept);

      const board = kept.slice(0, BOARD_SIZE);
      setEntries(board);
      setOffline(true);
      return { entry, rank: board.findIndex((row) => row.id === entry.id), offline: true };
    }
  }, []);

  return { entries, loaded, offline, submit, refresh };
}
