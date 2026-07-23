import { Chess } from "chess.js";
import type { Move, Square } from "chess.js";
import { useCallback, useMemo, useState } from "react";

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function replay(startFen: string, moves: Move[], upTo: number): Chess {
  const g = new Chess(startFen);
  for (let i = 0; i < upTo; i++) g.move(moves[i].san);
  return g;
}

export function useChessGame() {
  const [startFen, setStartFen] = useState(START_FEN);
  const [moves, setMoves] = useState<Move[]>([]);
  // Number of moves currently applied on the board (supports stepping back/forward).
  const [currentIndex, setCurrentIndex] = useState(0);

  const game = useMemo(
    () => replay(startFen, moves, currentIndex),
    [startFen, moves, currentIndex]
  );
  const fen = game.fen();

  // FEN of every position in the full move list (index 0 = start position).
  const positionFens = useMemo(() => {
    const g = new Chess(startFen);
    const fens = [g.fen()];
    for (const m of moves) {
      g.move(m.san);
      fens.push(g.fen());
    }
    return fens;
  }, [startFen, moves]);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: string): Move | null => {
      const g = replay(startFen, moves, currentIndex);
      let move: Move;
      try {
        move = g.move({ from, to, promotion });
      } catch {
        return null;
      }
      // Making a move while stepped back discards the abandoned continuation.
      setMoves((prev) => [...prev.slice(0, currentIndex), move]);
      setCurrentIndex((i) => i + 1);
      return move;
    },
    [startFen, moves, currentIndex]
  );

  const newGame = useCallback(() => {
    setStartFen(START_FEN);
    setMoves([]);
    setCurrentIndex(0);
  }, []);

  const loadFen = useCallback((input: string): boolean => {
    let normalized: string;
    try {
      normalized = new Chess(input.trim()).fen();
    } catch {
      return false;
    }
    setStartFen(normalized);
    setMoves([]);
    setCurrentIndex(0);
    return true;
  }, []);

  const loadPgn = useCallback((input: string): boolean => {
    const g = new Chess();
    try {
      g.loadPgn(input.trim());
    } catch {
      return false;
    }
    const initial = g.getHeaders().FEN ?? START_FEN;
    const history = g.history({ verbose: true });
    setStartFen(initial);
    setMoves(history);
    setCurrentIndex(history.length);
    return true;
  }, []);

  const pgn = useMemo(
    () => replay(startFen, moves, moves.length).pgn(),
    [startFen, moves]
  );

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(moves.length, index)));
    },
    [moves.length]
  );

  return {
    game,
    fen,
    startFen,
    moves,
    currentIndex,
    positionFens,
    pgn,
    makeMove,
    newGame,
    loadFen,
    loadPgn,
    goTo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < moves.length,
  };
}
