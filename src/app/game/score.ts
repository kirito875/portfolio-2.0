/**
 * Scoring rules for a single Knock-Down Tower run.
 *
 * Every number that affects the leaderboard lives here as a plain function, so
 * the scoring can be tuned in one place and reasoned about without touching
 * React or the physics scene.
 */

/** Tower shape — shared with the scene so the two can never drift apart. */
export const LEVELS = 6;
export const PER_LEVEL = 3;
export const TOTAL_BLOCKS = LEVELS * PER_LEVEL; // 18

/** Balls a player gets for one run. This is what makes the game a game. */
export const MAX_SHOTS = 5;

/** Base points for toppling a single block. */
export const POINTS_PER_BLOCK = 10;

/** Extra points for every block beyond the first that one shot brings down. */
export const MULTI_KNOCK_BONUS = 15;

/** Awarded for each ball the player never had to fire. */
export const UNUSED_BALL_BONUS = 100;

/** Awarded for flattening the entire tower. */
export const CLEAR_BONUS = 500;

/**
 * Higher blocks are worth more: the bottom level pays 1x and the top level 2x.
 * `level` is zero-based, so 0 is the bottom row.
 */
export function tierMultiplier(level: number): number {
  return 1 + level * 0.2;
}

/** Points for toppling one block that started on `level`. */
export function blockPoints(level: number): number {
  return Math.round(POINTS_PER_BLOCK * tierMultiplier(level));
}

/** Which level a block belongs to, derived from the order the tower is built. */
export function blockLevel(id: number): number {
  return Math.floor(id / PER_LEVEL);
}

/** End-of-run bonus: one reward for restraint, one for a clean sweep. */
export function runBonus(knocked: number, shotsUsed: number): number {
  const unused = Math.max(0, MAX_SHOTS - shotsUsed) * UNUSED_BALL_BONUS;
  const clear = knocked >= TOTAL_BLOCKS ? CLEAR_BONUS : 0;
  return unused + clear;
}
