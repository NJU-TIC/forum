export const SCORE_BUDGET = 100;
export const MIN_GAME_SCORE = 0;
export const MAX_GAME_SCORE = 10;

export function clampGameScore(score: number): number {
  return Math.min(MAX_GAME_SCORE, Math.max(MIN_GAME_SCORE, score));
}
