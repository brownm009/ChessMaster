import type { EvalRecord } from "../types";

export type MoveQuality =
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface Classification {
  quality: MoveQuality;
  /** Centipawns lost compared to the engine's best move (mover's perspective). */
  cpLoss: number;
}

export const QUALITY_LABEL: Record<MoveQuality, string> = {
  best: "Best move",
  excellent: "Excellent",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

export const QUALITY_GLYPH: Record<MoveQuality, string> = {
  best: "★",
  excellent: "!",
  good: "✓",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

/** Collapse an eval record into a single centipawn number (White's perspective).
 *  Mate scores map far outside the normal range, closer mates scoring higher. */
export function recordToCp(rec: EvalRecord): number {
  if (rec.mate !== null) {
    return rec.mate > 0 ? 10000 - rec.mate : -10000 - rec.mate;
  }
  return rec.cp ?? 0;
}

export function classifyMove(
  before: EvalRecord,
  after: EvalRecord,
  moverIsWhite: boolean,
  moveUci: string
): Classification {
  const sign = moverIsWhite ? 1 : -1;
  const evalBefore = recordToCp(before) * sign;
  const evalAfter = recordToCp(after) * sign;
  const cpLoss = Math.max(0, evalBefore - evalAfter);

  if (before.bestUci === moveUci) return { quality: "best", cpLoss };

  let quality: MoveQuality;
  if (cpLoss < 20) quality = "excellent";
  else if (cpLoss < 60) quality = "good";
  else if (cpLoss < 120) quality = "inaccuracy";
  else if (cpLoss < 250) quality = "mistake";
  else quality = "blunder";
  return { quality, cpLoss };
}
