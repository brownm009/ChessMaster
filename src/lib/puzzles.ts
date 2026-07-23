import type { EvalRecord } from "../types";
import { recordToCp } from "./classify";
import type { GameReport } from "./accuracy";

export interface Puzzle {
  /** Position to solve (before the mistake was played). */
  fen: string;
  /** Engine's best move in UCI. */
  solutionUci: string;
  /** Engine's best move in SAN. */
  solutionSan: string;
  /** The move actually played in the game. */
  playedSan: string;
  moverIsWhite: boolean;
  /** Value of the position (White's perspective) under best play. */
  bestCpWhite: number;
  moveNumber: number;
  /** How bad the original mistake was, in win-probability points. */
  winDrop: number;
}

/** How much win probability must be lost for a move to become a puzzle. */
const MIN_WIN_DROP = 8;
const MAX_PUZZLES = 12;

/**
 * Turns the mistakes from a game review into "find the best move" puzzles,
 * worst mistakes first.
 */
export function buildPuzzles(
  report: GameReport,
  evals: EvalRecord[],
  positionFens: string[]
): Puzzle[] {
  const puzzles: Puzzle[] = [];
  for (const m of report.moves) {
    if (!["inaccuracy", "mistake", "blunder"].includes(m.quality)) continue;
    if (m.winDrop < MIN_WIN_DROP) continue;
    const rec = evals[m.index];
    if (!rec?.bestUci || !m.bestSan) continue;
    if (m.bestSan === m.san) continue;
    puzzles.push({
      fen: positionFens[m.index],
      solutionUci: rec.bestUci,
      solutionSan: m.bestSan,
      playedSan: m.san,
      moverIsWhite: m.color === "w",
      bestCpWhite: recordToCp(rec),
      moveNumber: Math.floor(m.index / 2) + 1,
      winDrop: m.winDrop,
    });
  }
  return puzzles.sort((a, b) => b.winDrop - a.winDrop).slice(0, MAX_PUZZLES);
}
