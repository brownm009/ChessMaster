export type PlayAs = "both" | "white" | "black";

export type OpponentLevel =
  | "beginner"
  | "casual"
  | "intermediate"
  | "advanced"
  | "expert"
  | "max";

/** Target Stockfish UCI_Elo per difficulty level; null = full strength. */
export const OPPONENT_ELO: Record<OpponentLevel, number | null> = {
  beginner: 1350,
  casual: 1600,
  intermediate: 1900,
  advanced: 2200,
  expert: 2500,
  max: null,
};

export const OPPONENT_LABEL: Record<OpponentLevel, string> = {
  beginner: "Beginner (~1350)",
  casual: "Casual (~1600)",
  intermediate: "Intermediate (~1900)",
  advanced: "Advanced (~2200)",
  expert: "Expert (~2500)",
  max: "Maximum (full strength)",
};

export interface Settings {
  /** Which side the user controls; the engine plays the other side ("both" = self-play simulation) */
  playAs: PlayAs;
  /** Strength of the engine opponent when playing as White or Black */
  opponentLevel: OpponentLevel;
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
  playAs: "both",
  opponentLevel: "intermediate",
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
