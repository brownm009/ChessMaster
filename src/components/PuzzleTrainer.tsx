import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { Puzzle } from "../lib/puzzles";
import { usePuzzleEngine } from "../hooks/usePuzzleEngine";
import type { PositionEval } from "../hooks/usePuzzleEngine";

interface PuzzleTrainerProps {
  puzzles: Puzzle[];
  onExit: () => void;
}

type Status = "idle" | "checking" | "best" | "good" | "wrong" | "revealed";

/** Accept a non-best move if it loses at most this many centipawns. */
const EQUAL_TOLERANCE = 30;

function evalToCp(e: PositionEval): number {
  if (e.mate !== null) return e.mate > 0 ? 10000 - e.mate : -10000 - e.mate;
  return e.cp ?? 0;
}

export function PuzzleTrainer({ puzzles, onExit }: PuzzleTrainerProps) {
  const { evaluate } = usePuzzleEngine();
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [boardFen, setBoardFen] = useState(puzzles[0].fen);
  const [solvedCount, setSolvedCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  // Puzzles already counted as solved, so retries don't double-count.
  const scoredRef = useRef<Set<number>>(new Set());
  const resetTimer = useRef<number | undefined>(undefined);

  const puzzle = puzzles[index];
  const orientation = puzzle.moverIsWhite ? "white" : "black";

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(480);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () =>
      setBoardWidth(
        Math.max(280, Math.min(el.clientWidth, window.innerHeight - 240, 620))
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(resetTimer.current);
  }, []);

  const loadPuzzle = (i: number) => {
    window.clearTimeout(resetTimer.current);
    setIndex(i);
    setBoardFen(puzzles[i].fen);
    setStatus("idle");
    setMessage(null);
    setPendingPromotion(null);
    setSelected(null);
  };

  const markSolved = () => {
    if (!scoredRef.current.has(index)) {
      scoredRef.current.add(index);
      setSolvedCount((c) => c + 1);
    }
  };

  const finishAttempt = async (from: Square, to: Square, promotion?: string) => {
    const uci = from + to + (promotion ?? "");
    // Apply the move to a local board for display.
    const g = new Chess(puzzle.fen);
    let played;
    try {
      played = g.move({ from, to, promotion });
    } catch {
      return false;
    }
    setBoardFen(g.fen());

    if (uci === puzzle.solutionUci) {
      setStatus("best");
      setMessage(`Correct! ${puzzle.solutionSan} is the best move.`);
      markSolved();
      return true;
    }

    setStatus("checking");
    setMessage("Checking…");
    const afterEval = await evaluate(g.fen());
    const moverSign = puzzle.moverIsWhite ? 1 : -1;
    const bestForMover = puzzle.bestCpWhite * moverSign;
    const afterForMover = evalToCp(afterEval) * moverSign;
    const cpLoss = bestForMover - afterForMover;

    if (cpLoss <= EQUAL_TOLERANCE) {
      setStatus("good");
      setMessage(`${played.san} works too! (engine's pick: ${puzzle.solutionSan})`);
      markSolved();
      return true;
    }

    setStatus("wrong");
    setMessage(`${played.san} isn't best — try again.`);
    resetTimer.current = window.setTimeout(() => {
      setBoardFen(puzzle.fen);
      setStatus("idle");
      setMessage(null);
    }, 900);
    return true;
  };

  /** Returns true if the move was accepted for evaluation. */
  const attempt = (from: Square, to: Square) => {
    const g = new Chess(puzzle.fen);
    const legal = g
      .moves({ square: from, verbose: true })
      .find((m) => m.to === to);
    if (!legal) return false;
    setSelected(null);
    if (legal.promotion) {
      setPendingPromotion({ from, to });
      return false;
    }
    void finishAttempt(from, to);
    return true;
  };

  const onPieceDrop = (from: string, to: string) => {
    if (status !== "idle") return false;
    return attempt(from as Square, to as Square);
  };

  const onSquareClick = (squareStr: string) => {
    if (status !== "idle" || pendingPromotion) return;
    const square = squareStr as Square;
    const g = new Chess(puzzle.fen);
    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      if (attempt(selected, square)) return;
    }
    const piece = g.get(square);
    setSelected(piece && piece.color === g.turn() ? square : null);
  };

  const onPromotionPieceSelect = (piece?: string) => {
    const pp = pendingPromotion;
    setPendingPromotion(null);
    if (!piece || !pp) return false;
    void finishAttempt(pp.from, pp.to, piece[1].toLowerCase());
    return true;
  };

  const reveal = () => {
    window.clearTimeout(resetTimer.current);
    const g = new Chess(puzzle.fen);
    try {
      g.move({
        from: puzzle.solutionUci.slice(0, 2),
        to: puzzle.solutionUci.slice(2, 4),
        promotion:
          puzzle.solutionUci.length > 4 ? puzzle.solutionUci[4] : undefined,
      });
      setBoardFen(g.fen());
    } catch {
      /* ignore */
    }
    setStatus("revealed");
    setMessage(`The best move was ${puzzle.solutionSan}.`);
  };

  const solved = status === "best" || status === "good";
  const done = status === "revealed" || solved;
  const isLast = index === puzzles.length - 1;

  const solutionArrow = useMemo<[Square, Square, string][]>(() => {
    if (status !== "revealed") return [];
    return [
      [
        puzzle.solutionUci.slice(0, 2) as Square,
        puzzle.solutionUci.slice(2, 4) as Square,
        "#7fa650",
      ],
    ];
  }, [status, puzzle]);

  return (
    <div className="puzzle">
      <div className="puzzle-head">
        <span className="puzzle-count">
          Puzzle {index + 1} / {puzzles.length}
        </span>
        <span className="puzzle-score">Solved {solvedCount}</span>
        <button className="btn small ghost" onClick={onExit}>
          Exit
        </button>
      </div>

      <div className="puzzle-prompt">
        <b>{puzzle.moverIsWhite ? "White" : "Black"} to move</b> — find the best
        move. <span className="puzzle-context">(you played {puzzle.playedSan})</span>
      </div>

      <div className="board-wrapper" ref={wrapperRef}>
        <Chessboard
          id="puzzle-board"
          position={boardFen}
          boardWidth={boardWidth}
          boardOrientation={orientation}
          arePiecesDraggable={status === "idle"}
          onPieceDrop={onPieceDrop}
          onSquareClick={(sq) => onSquareClick(sq as string)}
          onPromotionPieceSelect={(piece) => onPromotionPieceSelect(piece)}
          showPromotionDialog={!!pendingPromotion}
          promotionToSquare={pendingPromotion?.to ?? null}
          customArrows={solutionArrow}
          customSquareStyles={
            selected ? { [selected]: { backgroundColor: "rgba(255,255,51,0.45)" } } : {}
          }
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
          customBoardStyle={{ borderRadius: "4px" }}
        />
      </div>

      <div className={`puzzle-message ${status}`}>
        {message ?? "Drag a piece to make your move."}
      </div>

      <div className="puzzle-buttons">
        {!done && (
          <button className="btn small ghost" onClick={reveal} disabled={status === "checking"}>
            Show solution
          </button>
        )}
        <span className="ie-spacer" />
        {isLast ? (
          <button className="btn primary small" onClick={onExit} disabled={!done}>
            Finish ({solvedCount}/{puzzles.length})
          </button>
        ) : (
          <button
            className="btn primary small"
            onClick={() => loadPuzzle(index + 1)}
            disabled={!done}
          >
            Next puzzle →
          </button>
        )}
      </div>
    </div>
  );
}
