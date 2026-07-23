import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Chess, Square } from "chess.js";
import type { CSSProperties } from "react";
import type { Settings } from "../types";

interface BoardPanelProps {
  game: Chess;
  orientation: "white" | "black";
  settings: Settings;
  lastMove: { from: Square; to: Square } | null;
  hint: { from: Square; to: Square } | null;
  onMove: (from: Square, to: Square, promotion?: string) => boolean;
  /** When false, the human cannot pick up or move pieces (engine's turn). */
  interactive: boolean;
}

const HIGHLIGHT = { backgroundColor: "rgba(255, 255, 51, 0.45)" };
const LEGAL_DOT: CSSProperties = {
  background:
    "radial-gradient(circle, rgba(0,0,0,0.16) 26%, transparent 27%)",
};
const LEGAL_CAPTURE: CSSProperties = {
  background:
    "radial-gradient(circle, transparent 60%, rgba(0,0,0,0.18) 61%)",
};
const CHECK_STYLE: CSSProperties = {
  background:
    "radial-gradient(circle, rgba(255,60,60,0.7) 20%, rgba(255,60,60,0.3) 55%, transparent 80%)",
};

function findKing(game: Chess, color: "w" | "b"): Square | null {
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq && sq.type === "k" && sq.color === color) return sq.square;
    }
  }
  return null;
}

export function BoardPanel({
  game,
  orientation,
  settings,
  lastMove,
  hint,
  onMove,
  interactive,
}: BoardPanelProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(560);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const maxByViewport = window.innerHeight - 170;
      setBoardWidth(
        Math.max(280, Math.min(el.clientWidth, maxByViewport, 760))
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Clear a pending selection when control is taken away (engine's turn).
  useEffect(() => {
    if (!interactive) setSelected(null);
  }, [interactive]);

  const fen = game.fen();
  const legalMoves = useMemo(
    () => (selected ? game.moves({ square: selected, verbose: true }) : []),
    [game, selected]
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (settings.highlightLast && lastMove) {
      styles[lastMove.from] = HIGHLIGHT;
      styles[lastMove.to] = HIGHLIGHT;
    }
    if (selected) styles[selected] = HIGHLIGHT;
    if (settings.highlightLegal) {
      for (const m of legalMoves) {
        styles[m.to] = m.captured ? LEGAL_CAPTURE : LEGAL_DOT;
      }
    }
    if (game.inCheck()) {
      const king = findKing(game, game.turn());
      if (king) styles[king] = { ...styles[king], ...CHECK_STYLE };
    }
    return styles;
  }, [settings.highlightLast, settings.highlightLegal, lastMove, selected, legalMoves, game]);

  const tryMove = (from: Square, to: Square, promotion?: string) => {
    const ok = onMove(from, to, promotion);
    if (ok) setSelected(null);
    return ok;
  };

  const onSquareClick = (square: Square) => {
    if (pendingPromotion || !interactive) return;
    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      const legal = legalMoves.find((m) => m.to === square);
      if (legal) {
        if (legal.promotion) {
          setPendingPromotion({ from: selected, to: square });
          return;
        }
        tryMove(selected, square);
        return;
      }
    }
    const piece = game.get(square);
    setSelected(piece && piece.color === game.turn() ? square : null);
  };

  const onPromotionPieceSelect = (
    piece?: string,
    promoteFrom?: Square,
    promoteTo?: Square
  ) => {
    const from = promoteFrom ?? pendingPromotion?.from;
    const to = promoteTo ?? pendingPromotion?.to;
    setPendingPromotion(null);
    if (!piece || !from || !to) return false;
    return tryMove(from, to, piece[1].toLowerCase());
  };

  const arrows: [Square, Square, string][] =
    settings.showBestMove && hint ? [[hint.from, hint.to, "#7fa650"]] : [];

  return (
    <div className="board-wrapper" ref={wrapperRef}>
      <Chessboard
        id="practice-board"
        position={fen}
        boardWidth={boardWidth}
        boardOrientation={orientation}
        animationDuration={150}
        showBoardNotation={settings.showCoordinates}
        arePiecesDraggable={interactive}
        isDraggablePiece={({ piece }) => interactive && piece[0] === game.turn()}
        onPieceDrop={(from, to) => tryMove(from as Square, to as Square)}
        onSquareClick={(square) => onSquareClick(square as Square)}
        onPromotionPieceSelect={(piece, from, to) =>
          onPromotionPieceSelect(piece, from as Square, to as Square)
        }
        showPromotionDialog={!!pendingPromotion}
        promotionToSquare={pendingPromotion?.to ?? null}
        customArrows={arrows}
        customSquareStyles={squareStyles}
        customDarkSquareStyle={{ backgroundColor: "#769656" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
        }}
      />
    </div>
  );
}
