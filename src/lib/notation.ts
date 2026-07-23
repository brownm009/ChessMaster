import { Chess } from "chess.js";

/** Converts a UCI move (e.g. "e2e4", "e7e8q") to SAN for the given position. */
export function uciToSan(fen: string, uci: string): string | null {
  try {
    const g = new Chess(fen);
    const move = g.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return move.san;
  } catch {
    return null;
  }
}
