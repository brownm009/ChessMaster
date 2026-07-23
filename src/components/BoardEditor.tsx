import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Chess as ChessType } from "chess.js";
import { Chessboard } from "react-chessboard";

interface BoardEditorProps {
  /** Position to start editing from. */
  initialGame: ChessType;
  orientation: "white" | "black";
  onCancel: () => void;
  onApply: (fen: string) => void;
}

type PieceCode = string; // e.g. "wK", "bP"

const WHITE_PIECES: PieceCode[] = ["wK", "wQ", "wR", "wB", "wN", "wP"];
const BLACK_PIECES: PieceCode[] = ["bK", "bQ", "bR", "bB", "bN", "bP"];

const GLYPH: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function boardFromGame(game: ChessType): Record<string, PieceCode> {
  const map: Record<string, PieceCode> = {};
  for (const row of game.board()) {
    for (const sq of row) {
      if (sq) map[sq.square] = sq.color + sq.type.toUpperCase();
    }
  }
  return map;
}

function startPosition(): Record<string, PieceCode> {
  return boardFromGame(new Chess());
}

/** Builds a FEN from the editor state (en passant/clocks left at defaults). */
function toFen(
  board: Record<string, PieceCode>,
  turn: "w" | "b",
  castling: Record<"K" | "Q" | "k" | "q", boolean>
): string {
  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = "";
    let empty = 0;
    for (const file of FILES) {
      const piece = board[file + rank];
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      const letter = piece[1];
      row += piece[0] === "w" ? letter.toUpperCase() : letter.toLowerCase();
    }
    if (empty) row += empty;
    rows.push(row);
  }
  const rights =
    (["K", "Q", "k", "q"] as const).filter((c) => castling[c]).join("") || "-";
  return `${rows.join("/")} ${turn} ${rights} - 0 1`;
}

function validate(fen: string, board: Record<string, PieceCode>): string | null {
  const pieces = Object.values(board);
  if (pieces.filter((p) => p === "wK").length !== 1)
    return "There must be exactly one white king.";
  if (pieces.filter((p) => p === "bK").length !== 1)
    return "There must be exactly one black king.";
  for (const [sq, piece] of Object.entries(board)) {
    const rank = sq[1];
    if (piece[1] === "P" && (rank === "1" || rank === "8"))
      return "Pawns cannot stand on the first or last rank.";
  }
  try {
    // chess.js rejects illegal positions (e.g. side-not-to-move in check).
    new Chess(fen);
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid position.";
  }
  return null;
}

export function BoardEditor({
  initialGame,
  orientation,
  onCancel,
  onApply,
}: BoardEditorProps) {
  const [board, setBoard] = useState<Record<string, PieceCode>>(() =>
    boardFromGame(initialGame)
  );
  const [turn, setTurn] = useState<"w" | "b">(initialGame.turn());
  const [castling, setCastling] = useState({
    K: false, Q: false, k: false, q: false,
  });
  const [selected, setSelected] = useState<PieceCode | "erase">("wP");
  const [error, setError] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(480);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () =>
      setBoardWidth(
        Math.max(280, Math.min(el.clientWidth, window.innerHeight - 260, 620))
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

  const position = useMemo(() => ({ ...board }), [board]);

  const placeOn = (square: string) => {
    setError(null);
    setBoard((prev) => {
      const next = { ...prev };
      if (selected === "erase") delete next[square];
      else next[square] = selected;
      return next;
    });
  };

  const onPieceDrop = (from: string, to: string) => {
    setError(null);
    setBoard((prev) => {
      const next = { ...prev };
      if (next[from]) {
        next[to] = next[from];
        delete next[from];
      }
      return next;
    });
    return true;
  };

  const apply = () => {
    const fen = toFen(board, turn, castling);
    const err = validate(fen, board);
    if (err) {
      setError(err);
      return;
    }
    onApply(fen);
  };

  const paletteButton = (code: PieceCode) => (
    <button
      key={code}
      className={`palette-btn ${selected === code ? "active" : ""} ${
        code[0] === "w" ? "light" : "dark"
      }`}
      onClick={() => setSelected(code)}
      title={`Place ${code}`}
    >
      {GLYPH[code]}
    </button>
  );

  return (
    <div className="editor">
      <div className="editor-hint">
        Pick a piece, then click squares to place it. Drag to move pieces.
      </div>
      <div className="board-wrapper" ref={wrapperRef}>
        <Chessboard
          id="editor-board"
          position={position}
          boardWidth={boardWidth}
          boardOrientation={orientation}
          arePiecesDraggable
          onPieceDrop={(from, to) => onPieceDrop(from as string, to as string)}
          onSquareClick={(sq) => placeOn(sq as string)}
          customDarkSquareStyle={{ backgroundColor: "#769656" }}
          customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
          customBoardStyle={{ borderRadius: "4px" }}
        />
      </div>

      <div className="palette">
        <div className="palette-row">{WHITE_PIECES.map(paletteButton)}</div>
        <div className="palette-row">{BLACK_PIECES.map(paletteButton)}</div>
        <button
          className={`palette-btn erase ${selected === "erase" ? "active" : ""}`}
          onClick={() => setSelected("erase")}
          title="Eraser"
        >
          ⌫ Erase
        </button>
      </div>

      <div className="editor-options">
        <div className="editor-turn">
          <span className="editor-label">Side to move</span>
          <div className="playas">
            <button
              className={`playas-btn ${turn === "w" ? "active" : ""}`}
              onClick={() => setTurn("w")}
            >
              White
            </button>
            <button
              className={`playas-btn ${turn === "b" ? "active" : ""}`}
              onClick={() => setTurn("b")}
            >
              Black
            </button>
          </div>
        </div>
        <div className="editor-castling">
          <span className="editor-label">Castling</span>
          <div className="castle-boxes">
            {(["K", "Q", "k", "q"] as const).map((c) => (
              <label key={c} className="castle-box">
                <input
                  type="checkbox"
                  checked={castling[c]}
                  onChange={(e) =>
                    setCastling((cs) => ({ ...cs, [c]: e.target.checked }))
                  }
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="editor-error">{error}</div>}

      <div className="editor-buttons">
        <button className="btn small ghost" onClick={() => setBoard({})}>
          Clear
        </button>
        <button
          className="btn small ghost"
          onClick={() => setBoard(startPosition())}
        >
          Start position
        </button>
        <span className="ie-spacer" />
        <button className="btn small ghost" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn primary small" onClick={apply}>
          Lock in &amp; play
        </button>
      </div>
    </div>
  );
}
