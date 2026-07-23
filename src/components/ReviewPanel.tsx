import { useMemo } from "react";
import type { Move } from "chess.js";
import { buildReport } from "../lib/accuracy";
import type { GameReport } from "../lib/accuracy";
import { QUALITY_GLYPH, QUALITY_LABEL } from "../lib/classify";
import type { MoveQuality } from "../lib/classify";
import { uciToSan } from "../lib/notation";
import { buildPuzzles } from "../lib/puzzles";
import type { Puzzle } from "../lib/puzzles";
import { useGameReview } from "../hooks/useGameReview";

interface ReviewPanelProps {
  moves: Move[];
  positionFens: string[];
  onJump: (index: number) => void;
  onTrain: (puzzles: Puzzle[]) => void;
}

const SUMMARY_ROWS: MoveQuality[] = [
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
];

function accuracyColor(acc: number): string {
  if (acc >= 90) return "var(--green)";
  if (acc >= 80) return "#a3b8a0";
  if (acc >= 70) return "var(--yellow)";
  if (acc >= 55) return "var(--orange)";
  return "var(--red)";
}

export function ReviewPanel({
  moves,
  positionFens,
  onJump,
  onTrain,
}: ReviewPanelProps) {
  const { running, done, total, evals, run, reset } = useGameReview();

  const report: GameReport | null = useMemo(() => {
    if (!evals) return null;
    const bestSans = evals.map((e, i) =>
      e.bestUci ? uciToSan(positionFens[i], e.bestUci) : null
    );
    return buildReport(moves, evals, bestSans);
  }, [evals, moves, positionFens]);

  const puzzles = useMemo<Puzzle[]>(() => {
    if (!report || !evals) return [];
    return buildPuzzles(report, evals, positionFens);
  }, [report, evals, positionFens]);

  if (moves.length === 0) {
    return (
      <p className="move-list-empty">
        Play some moves, then review the game for accuracy and mistakes.
      </p>
    );
  }

  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="review">
      {!report && (
        <button
          className="btn primary review-run"
          disabled={running}
          onClick={() => run(positionFens)}
        >
          {running ? `Analyzing… ${done}/${total}` : "Review game"}
        </button>
      )}
      {running && (
        <div className="review-progress">
          <div className="review-progress-bar" style={{ width: `${pct}%` }} />
        </div>
      )}

      {report && (
        <>
          <div className="acc-row">
            <div className="acc-cell">
              <span className="acc-side">White</span>
              <span
                className="acc-value"
                style={{ color: accuracyColor(report.white.accuracy) }}
              >
                {report.white.accuracy.toFixed(1)}%
              </span>
            </div>
            <div className="acc-cell">
              <span className="acc-side">Black</span>
              <span
                className="acc-value"
                style={{ color: accuracyColor(report.black.accuracy) }}
              >
                {report.black.accuracy.toFixed(1)}%
              </span>
            </div>
          </div>

          <table className="acc-table">
            <tbody>
              {SUMMARY_ROWS.map((q) => {
                const w = report.white.counts[q];
                const b = report.black.counts[q];
                if (!w && !b) return null;
                return (
                  <tr key={q}>
                    <td className="acc-w">{w}</td>
                    <td className={`acc-label q-${q}`}>
                      {QUALITY_GLYPH[q]} {QUALITY_LABEL[q]}
                    </td>
                    <td className="acc-b">{b}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {report.critical.length > 0 && (
            <div className="critical">
              <div className="critical-title">Key moments</div>
              {report.critical.map((m) => {
                const moveNo = Math.floor(m.index / 2) + 1;
                const dots = m.color === "w" ? "." : "…";
                return (
                  <button
                    key={m.index}
                    className="critical-item"
                    onClick={() => onJump(m.index + 1)}
                  >
                    <span className={`quality-badge q-${m.quality}`}>
                      {QUALITY_GLYPH[m.quality]}
                    </span>
                    <span className="critical-move">
                      {moveNo}
                      {dots} {m.san}
                    </span>
                    <span className="critical-drop">
                      −{m.winDrop.toFixed(0)}%
                    </span>
                    {m.bestSan && m.bestSan !== m.san && (
                      <span className="critical-best">best {m.bestSan}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {puzzles.length > 0 && (
            <button
              className="btn primary review-train"
              onClick={() => onTrain(puzzles)}
            >
              ♟ Train these mistakes ({puzzles.length})
            </button>
          )}
          <button className="btn small ghost review-again" onClick={reset}>
            Close review
          </button>
        </>
      )}
    </div>
  );
}
