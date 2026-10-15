"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Leaderboard from "./Leaderboard";
import type { GameStats } from "./TowerScene";
import { MAX_SHOTS } from "./score";
import { loadPlayerName, savePlayerName, useLeaderboard } from "./useLeaderboard";
import "./game.css";

// WebGL can only run in the browser, so the scene is client-only. This also
// keeps three.js + cannon in their own lazily-loaded chunk.
const TowerScene = dynamic(() => import("./TowerScene"), { ssr: false });

const EMPTY_STATS: GameStats = {
  shots: 0,
  maxShots: MAX_SHOTS,
  knocked: 0,
  total: 0,
  score: 0,
  finished: false,
};

const MAX_NAME_LENGTH = 14;

/** Eases a number towards its new value so the score ticks up on a hit. */
function useCountUp(value: number, duration = 450): number {
  const [display, setDisplay] = useState(value);
  const settledRef = useRef(value);

  useEffect(() => {
    const from = settledRef.current;
    if (from === value) return undefined;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        settledRef.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return display;
}

export default function GamePage() {
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const [resetSignal, setResetSignal] = useState(0);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [savedId, setSavedId] = useState<string | undefined>(undefined);
  const [savedRank, setSavedRank] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);

  const { entries, loaded, offline, submit } = useLeaderboard();

  useEffect(() => {
    setName(loadPlayerName());
  }, []);

  const handleStats = useCallback((next: GameStats) => setStats(next), []);
  const handleReady = useCallback(() => setReady(true), []);

  const startRun = useCallback(() => {
    setSavedId(undefined);
    setSavedRank(null);
    setSavedOffline(false);
    setResetSignal((n) => n + 1);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (saving) return;

      const trimmed = name.trim().slice(0, MAX_NAME_LENGTH) || "Anonymous";
      savePlayerName(trimmed);
      setSaving(true);

      try {
        const result = await submit({
          name: trimmed,
          score: stats.score,
          shots: stats.shots,
          knocked: stats.knocked,
        });

        setName(trimmed);
        setSavedId(result.entry.id);
        setSavedRank(result.rank);
        setSavedOffline(result.offline);
      } finally {
        setSaving(false);
      }
    },
    [name, saving, stats, submit],
  );

  const shotsLeft = Math.max(0, stats.maxShots - stats.shots);
  const liveScore = useCountUp(stats.score);
  const over = stats.finished;

  return (
    <section className="game">
      <header className="game__head">
        <h1>Knock-Down Tower</h1>
        <p>
          Five balls to bring the tower down. Higher blocks are worth more, landing one shot on
          several blocks pays a bonus, and unused balls are worth <strong>100 each</strong>. Built
          with <strong>@react-three/fiber</strong>, simulated by <strong>@react-three/cannon</strong>.
        </p>
      </header>

      <Leaderboard entries={entries} highlightId={savedId} loading={!loaded} offline={offline} />

      <div className="game__hud">
        <div className="game__stat game__stat--score">
          <span>Score</span>
          <strong>{liveScore.toLocaleString()}</strong>
        </div>
        <div className="game__stat">
          <span>Shots left</span>
          <strong>
            {shotsLeft}
            <em> / {stats.maxShots}</em>
          </strong>
          <span className="game__dots" aria-hidden="true">
            {Array.from({ length: stats.maxShots }).map((_, index) => (
              <i
                key={index}
                className={index < shotsLeft ? "game__dot game__dot--live" : "game__dot"}
              />
            ))}
          </span>
        </div>
        <div className="game__stat">
          <span>Blocks down</span>
          <strong>
            {stats.knocked}
            <em> / {stats.total || "—"}</em>
          </strong>
        </div>
        <button type="button" className="game__btn" onClick={startRun}>
          Rebuild tower
        </button>
      </div>

      <div className="game__stage">
        <div className="game__mount">
          {!ready && (
            <div className="game__loader" role="status" aria-live="polite">
              <span className="game__spinner" aria-hidden="true" />
              <p className="game__loading-text">Loading the 3D scene…</p>
              <p className="game__loading-hint">
                Fetching three.js and the physics engine — first load can take a moment.
              </p>
            </div>
          )}

          <TowerScene onStats={handleStats} resetSignal={resetSignal} onReady={handleReady} />

          {over && (
            <div className="game__over" role="dialog" aria-modal="true" aria-labelledby="run-score">
              <div className="game__over-card">
                <p className="eyebrow">Run complete</p>
                <h2 id="run-score" className="game__over-score">
                  {stats.score.toLocaleString()}
                </h2>
                <p className="game__over-line">
                  {stats.knocked} of {stats.total} blocks down · {stats.shots}{" "}
                  {stats.shots === 1 ? "shot" : "shots"} used
                </p>

                {savedId ? (
                  <p className="game__over-note" role="status">
                    {savedRank !== null && savedRank >= 0
                      ? `Saved — you are #${savedRank + 1} on the board.`
                      : "Saved, but it did not crack the top 5."}
                    {savedOffline && (
                      <span className="game__over-sub">
                        The shared board was unreachable, so this run is only on this device.
                      </span>
                    )}
                  </p>
                ) : (
                  <form className="game__form" onSubmit={handleSubmit}>
                    <label htmlFor="player-name">Name for the board</label>
                    <input
                      id="player-name"
                      name="name"
                      maxLength={MAX_NAME_LENGTH}
                      value={name}
                      placeholder="Your name"
                      autoComplete="nickname"
                      disabled={saving}
                      onChange={(event) => setName(event.target.value)}
                    />
                    <button type="submit" className="game__btn game__btn--wide" disabled={saving}>
                      {saving ? "Saving…" : "Save score"}
                    </button>
                  </form>
                )}

                <button type="button" className="game__btn game__btn--ghost game__btn--wide" onClick={startRun}>
                  Play again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ul className="game__help">
        <li>
          <kbd>Move</kbd> aim the crosshair
        </li>
        <li>
          <kbd>Click</kbd> fire a ball
        </li>
        <li>
          <kbd>Drag</kbd> orbit the camera
        </li>
        <li>
          <kbd>Scroll</kbd> zoom
        </li>
        <li>
          <kbd>{MAX_SHOTS} shots</kbd> per run
        </li>
      </ul>
    </section>
  );
}
