import type { Move } from "chess.js";
import type { EvalRecord } from "../types";
import { classifyMove, recordToCp } from "./classify";
import type { Classification, MoveQuality } from "./classify";

/** White's win probability (0–100) for a centipawn score from White's view. */
export function winPercent(cpWhite: number): number {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cpWhite)) - 1);
}

/** Per-move accuracy (0–100) from the drop in the mover's win probability. */
function moveAccuracy(winBefore: number, winAfter: number): number {
  const drop = Math.max(0, winBefore - winAfter);
  const acc = 103.1668 * Math.exp(-0.04354 * drop) - 3.669;
  return Math.max(0, Math.min(100, acc));
}

export interface MoveReport {
  index: number;
  san: string;
  color: "w" | "b";
  quality: MoveQuality;
  /** Loss in the mover's win probability (percentage points). */
  winDrop: number;
  cpLoss: number;
  bestSan: string | null;
}

export interface SideReport {
  accuracy: number;
  avgCpLoss: number;
  counts: Record<MoveQuality, number>;
}

export interface GameReport {
  white: SideReport;
  black: SideReport;
  moves: MoveReport[];
  /** Biggest mistakes, worst first. */
  critical: MoveReport[];
}

function emptyCounts(): Record<MoveQuality, number> {
  return {
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
}

/**
 * Builds a chess.com-style report from full-game evals. `evals[i]` is the
 * evaluation of the position *before* move `i` (so evals has moves.length + 1
 * entries). `bestSans[i]` is the best move (SAN) in that position, if known.
 */
export function buildReport(
  moves: Move[],
  evals: EvalRecord[],
  bestSans: (string | null)[]
): GameReport {
  const white: SideReport = { accuracy: 0, avgCpLoss: 0, counts: emptyCounts() };
  const black: SideReport = { accuracy: 0, avgCpLoss: 0, counts: emptyCounts() };
  const moveReports: MoveReport[] = [];
  const accSum = { w: 0, b: 0 };
  const cpSum = { w: 0, b: 0 };
  const moveCount = { w: 0, b: 0 };

  for (let i = 0; i < moves.length; i++) {
    const before = evals[i];
    const after = evals[i + 1];
    if (!before || !after) continue;
    const move = moves[i];
    const moverIsWhite = move.color === "w";
    const uci = move.from + move.to + (move.promotion ?? "");
    const cls: Classification = classifyMove(before, after, moverIsWhite, uci);

    const wpBefore = winPercent(recordToCp(before));
    const wpAfter = winPercent(recordToCp(after));
    const moverBefore = moverIsWhite ? wpBefore : 100 - wpBefore;
    const moverAfter = moverIsWhite ? wpAfter : 100 - wpAfter;
    const winDrop = Math.max(0, moverBefore - moverAfter);
    const acc = moveAccuracy(moverBefore, moverAfter);

    const side = moverIsWhite ? "w" : "b";
    accSum[side] += acc;
    cpSum[side] += cls.cpLoss;
    moveCount[side] += 1;
    (moverIsWhite ? white : black).counts[cls.quality] += 1;

    moveReports.push({
      index: i,
      san: move.san,
      color: move.color,
      quality: cls.quality,
      winDrop,
      cpLoss: cls.cpLoss,
      bestSan: bestSans[i] ?? null,
    });
  }

  white.accuracy = moveCount.w ? accSum.w / moveCount.w : 100;
  black.accuracy = moveCount.b ? accSum.b / moveCount.b : 100;
  white.avgCpLoss = moveCount.w ? cpSum.w / moveCount.w : 0;
  black.avgCpLoss = moveCount.b ? cpSum.b / moveCount.b : 0;

  const critical = [...moveReports]
    .filter((m) => m.winDrop >= 5)
    .sort((a, b) => b.winDrop - a.winDrop)
    .slice(0, 5);

  return { white, black, moves: moveReports, critical };
}
