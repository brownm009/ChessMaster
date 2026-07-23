export interface Settings {
  /** Show the engine's suggested best move as an arrow on the board */
  showBestMove: boolean;
  /** Show the evaluation bar next to the board */
  showEvalBar: boolean;
  /** Classify played moves (best / good / inaccuracy / mistake / blunder) */
  moveFeedback: boolean;
  /** Highlight legal target squares of the selected piece */
  highlightLegal: boolean;
  /** Highlight the last played move */
  highlightLast: boolean;
  /** Show board coordinates */
  showCoordinates: boolean;
  /** Flip the board automatically so the side to move is at the bottom */
  autoFlip: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  showBestMove: true,
  showEvalBar: true,
  moveFeedback: true,
  highlightLegal: true,
  highlightLast: true,
  showCoordinates: true,
  autoFlip: false,
};

/** Engine evaluation of a single position, always from White's perspective. */
export interface EvalRecord {
  cp: number | null;
  mate: number | null;
  bestUci: string | null;
  depth: number;
}
