"use client";

import type { ScoreEntry } from "./board";

/** Renders the top-5 strip that sits above the play area. */
export default function Leaderboard({
  entries,
  highlightId,
  loading,
  offline,
}: {
  entries: ScoreEntry[];
  highlightId?: string;
  loading?: boolean;
  offline?: boolean;
}) {
  const scope = offline ? "Best runs on this device" : "Best runs across all players";

  return (
    <section className="board" aria-label="Top 5 scores">
      <header className="board__head">
        <h2>Top 5</h2>
        <span className="board__sub">{loading ? "Loading…" : scope}</span>
      </header>

      {loading ? (
        <p className="board__empty">Loading scores…</p>
      ) : entries.length === 0 ? (
        <p className="board__empty">
          No scores yet — take the tower down and claim first place.
        </p>
      ) : (
        <ol className="board__list">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className={`board__row${entry.id === highlightId ? " board__row--you" : ""}`}
            >
              <span className={`board__rank board__rank--${index + 1}`} aria-label={`Rank ${index + 1}`}>
                {index + 1}
              </span>
              <span className="board__name" title={entry.name}>
                {entry.name}
              </span>
              <span className="board__meta">
                {entry.knocked} blocks · {entry.shots} {entry.shots === 1 ? "shot" : "shots"}
              </span>
              <span className="board__score">{entry.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
