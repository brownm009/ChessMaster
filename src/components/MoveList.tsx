import type { Move } from "chess.js";
import type { Classification } from "../lib/classify";
import { QUALITY_GLYPH, QUALITY_LABEL } from "../lib/classify";

interface MoveListProps {
  moves: Move[];
  currentIndex: number;
  classifications: (Classification | null)[];
  onSelect: (index: number) => void;
}

export function MoveList({
  moves,
  currentIndex,
  classifications,
  onSelect,
}: MoveListProps) {
  const rows: { number: number; white: number; black: number | null }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      number: i / 2 + 1,
      white: i,
      black: i + 1 < moves.length ? i + 1 : null,
    });
  }

  const cell = (index: number) => {
    const cls = classifications[index];
    return (
      <button
        className={`move-cell ${currentIndex === index + 1 ? "active" : ""}`}
        onClick={() => onSelect(index + 1)}
        title={cls ? QUALITY_LABEL[cls.quality] : undefined}
      >
        {moves[index].san}
        {cls && (
          <span className={`quality-badge q-${cls.quality}`}>
            {QUALITY_GLYPH[cls.quality]}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="move-list">
      {rows.length === 0 && (
        <p className="move-list-empty">
          Make a move for either side to start the simulation.
        </p>
      )}
      {rows.map((row) => (
        <div className="move-row" key={row.number}>
          <span className="move-number">{row.number}.</span>
          {cell(row.white)}
          {row.black !== null ? cell(row.black) : <span className="move-cell" />}
        </div>
      ))}
    </div>
  );
}
