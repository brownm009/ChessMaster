import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { BoardPanel } from "./components/BoardPanel";
import { EvalBar } from "./components/EvalBar";
import { ImportExport } from "./components/ImportExport";
import { MoveList } from "./components/MoveList";
import { SettingsPanel } from "./components/SettingsPanel";
import { useChessGame } from "./hooks/useChessGame";
import { useEngine } from "./hooks/useEngine";
import { classifyMove, QUALITY_GLYPH, QUALITY_LABEL } from "./lib/classify";
import type { Classification } from "./lib/classify";
import { detectOpening } from "./lib/openings";
import { DEFAULT_SETTINGS } from "./types";
import type { EvalRecord, Settings } from "./types";

const SETTINGS_KEY = "chessmaster-settings";
/** Minimum depth before an eval is trusted for move feedback. */
const MIN_FEEDBACK_DEPTH = 10;

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fall through to defaults
  }
  return DEFAULT_SETTINGS;
}

function uciToSan(fen: string, uci: string): string | null {
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

function pvToSan(fen: string, pv: string[], limit = 6): string {
  const g = new Chess(fen);
  const sans: string[] = [];
  for (const uci of pv.slice(0, limit)) {
    try {
      const move = g.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return sans.join(" ");
}

/** Eval for terminal positions is known without the engine. */
function terminalEval(fen: string): EvalRecord | null {
  const g = new Chess(fen);
  if (g.isCheckmate()) {
    return { cp: null, mate: g.turn() === "w" ? -1 : 1, bestUci: null, depth: 99 };
  }
  if (g.isDraw() || g.isStalemate()) {
    return { cp: 0, mate: null, bestUci: null, depth: 99 };
  }
  return null;
}

export default function App() {
  const {
    game,
    fen,
    moves,
    currentIndex,
    positionFens,
    pgn,
    makeMove,
    newGame,
    loadFen,
    loadPgn,
    goTo,
    canUndo,
    canRedo,
  } = useChessGame();

  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [manualOrientation, setManualOrientation] = useState<"white" | "black">("white");
  const [evalMap, setEvalMap] = useState<Record<string, EvalRecord>>({});

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })),
    []
  );

  const gameOver = game.isGameOver();
  const engineNeeded =
    settings.showBestMove || settings.showEvalBar || settings.moveFeedback;
  const { status: engineStatus, analysis } = useEngine(
    engineNeeded && !gameOver ? fen : null
  );

  // Remember every analyzed position so past moves can be rated.
  useEffect(() => {
    if (!analysis || analysis.depth < MIN_FEEDBACK_DEPTH) return;
    setEvalMap((prev) => {
      const existing = prev[analysis.fen];
      if (existing && existing.depth >= analysis.depth) return prev;
      return {
        ...prev,
        [analysis.fen]: {
          cp: analysis.cp,
          mate: analysis.mate,
          bestUci: analysis.bestUci,
          depth: analysis.depth,
        },
      };
    });
  }, [analysis]);

  const getEval = useCallback(
    (positionFen: string): EvalRecord | null =>
      evalMap[positionFen] ?? terminalEval(positionFen),
    [evalMap]
  );

  const classifications = useMemo<(Classification | null)[]>(() => {
    if (!settings.moveFeedback) return moves.map(() => null);
    return moves.map((move, i) => {
      const before = getEval(positionFens[i]);
      const after = getEval(positionFens[i + 1]);
      if (!before || !after) return null;
      const uci = move.from + move.to + (move.promotion ?? "");
      return classifyMove(before, after, move.color === "w", uci);
    });
  }, [moves, positionFens, getEval, settings.moveFeedback]);

  const currentAnalysis = analysis && analysis.fen === fen ? analysis : null;
  const displayEval = currentAnalysis ?? getEval(fen);

  const hint = useMemo(() => {
    if (!settings.showBestMove || gameOver) return null;
    const best = currentAnalysis?.bestUci ?? evalMap[fen]?.bestUci;
    if (!best) return null;
    return { from: best.slice(0, 2) as Square, to: best.slice(2, 4) as Square };
  }, [settings.showBestMove, gameOver, currentAnalysis, evalMap, fen]);

  const hintSan = useMemo(() => {
    const best = currentAnalysis?.bestUci ?? evalMap[fen]?.bestUci;
    return best ? uciToSan(fen, best) : null;
  }, [currentAnalysis, evalMap, fen]);

  const engineLine = useMemo(
    () => (currentAnalysis?.pv.length ? pvToSan(fen, currentAnalysis.pv) : ""),
    [currentAnalysis, fen]
  );

  const orientation = settings.autoFlip
    ? game.turn() === "w"
      ? "white"
      : "black"
    : manualOrientation;

  const lastMove = useMemo(() => {
    if (currentIndex === 0) return null;
    const m = moves[currentIndex - 1];
    return { from: m.from, to: m.to };
  }, [moves, currentIndex]);

  const onMove = useCallback(
    (from: Square, to: Square, promotion?: string) =>
      makeMove(from, to, promotion) !== null,
    [makeMove]
  );

  // Keyboard navigation like chess.com: arrows step through the game.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") goTo(currentIndex - 1);
      else if (e.key === "ArrowRight") goTo(currentIndex + 1);
      else if (e.key === "ArrowUp") goTo(0);
      else if (e.key === "ArrowDown") goTo(moves.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goTo, currentIndex, moves.length]);

  const opening = useMemo(
    () => detectOpening(moves.slice(0, currentIndex).map((m) => m.san)),
    [moves, currentIndex]
  );

  const status = useMemo(() => {
    if (game.isCheckmate()) {
      return game.turn() === "w"
        ? "Checkmate — Black wins"
        : "Checkmate — White wins";
    }
    if (game.isStalemate()) return "Draw — stalemate";
    if (game.isThreefoldRepetition()) return "Draw — threefold repetition";
    if (game.isInsufficientMaterial()) return "Draw — insufficient material";
    if (game.isDraw()) return "Draw";
    const side = game.turn() === "w" ? "White" : "Black";
    return game.inCheck() ? `${side} to move — check!` : `${side} to move`;
  }, [game]);

  // Feedback for the move that was just played.
  const lastClassification =
    currentIndex > 0 ? classifications[currentIndex - 1] : null;
  const lastMoveSan = currentIndex > 0 ? moves[currentIndex - 1].san : null;
  const lastBestSan = useMemo(() => {
    if (currentIndex === 0 || !lastClassification) return null;
    if (!["inaccuracy", "mistake", "blunder"].includes(lastClassification.quality))
      return null;
    const before = getEval(positionFens[currentIndex - 1]);
    return before?.bestUci
      ? uciToSan(positionFens[currentIndex - 1], before.bestUci)
      : null;
  }, [currentIndex, lastClassification, getEval, positionFens]);

  const evalLabel =
    displayEval == null
      ? "—"
      : displayEval.mate != null
        ? `${displayEval.mate > 0 ? "+" : "-"}M${Math.abs(displayEval.mate)}`
        : `${(displayEval.cp ?? 0) >= 0 ? "+" : ""}${((displayEval.cp ?? 0) / 100).toFixed(2)}`;

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">♞ ChessMaster</span>
        <span className="tagline">your personal practice board</span>
      </header>

      <main className="layout">
        {settings.showEvalBar && (
          <EvalBar
            cp={displayEval?.cp ?? null}
            mate={displayEval?.mate ?? null}
            orientation={orientation}
          />
        )}

        <section className="board-column">
          <div className="status-bar">
            <span className={`turn-dot ${game.turn() === "w" ? "white" : "black"}`} />
            <span className="status-text">{status}</span>
            {opening && <span className="opening-name">{opening}</span>}
          </div>

          <BoardPanel
            game={game}
            orientation={orientation}
            settings={settings}
            lastMove={lastMove}
            hint={hint}
            onMove={onMove}
          />

          <div className="feedback-bar">
            {settings.moveFeedback && lastClassification && lastMoveSan ? (
              <span className={`feedback q-${lastClassification.quality}`}>
                <b>
                  {lastMoveSan} {QUALITY_GLYPH[lastClassification.quality]}
                </b>{" "}
                {QUALITY_LABEL[lastClassification.quality]}
                {lastBestSan && (
                  <>
                    {" "}
                    — best was <b>{lastBestSan}</b>
                  </>
                )}
              </span>
            ) : (
              <span className="feedback muted">
                {settings.moveFeedback
                  ? "Play a move to get feedback."
                  : "Move feedback is off."}
              </span>
            )}
          </div>
        </section>

        <aside className="sidebar">
          <div className="panel engine-panel">
            <div className="panel-title">
              Engine
              <span className={`engine-status ${engineStatus}`}>
                {engineStatus === "ready"
                  ? engineNeeded && !gameOver
                    ? `depth ${currentAnalysis?.depth ?? 0}`
                    : "idle"
                  : engineStatus === "loading"
                    ? "loading…"
                    : "unavailable"}
              </span>
            </div>
            <div className="engine-eval">{evalLabel}</div>
            {settings.showBestMove && hintSan && (
              <div className="engine-best">
                Best move: <b>{hintSan}</b>
              </div>
            )}
            {engineLine && <div className="engine-line">{engineLine}</div>}
            {engineStatus === "error" && (
              <div className="engine-line">
                Stockfish could not be loaded — hints and feedback are disabled.
              </div>
            )}
          </div>

          <div className="panel moves-panel">
            <div className="panel-title">Moves</div>
            <MoveList
              moves={moves}
              currentIndex={currentIndex}
              classifications={classifications}
              onSelect={goTo}
            />
            <div className="nav-buttons">
              <button className="btn nav" onClick={() => goTo(0)} disabled={!canUndo} title="First move (↑)">
                ⏮
              </button>
              <button className="btn nav" onClick={() => goTo(currentIndex - 1)} disabled={!canUndo} title="Back (←)">
                ◀
              </button>
              <button className="btn nav" onClick={() => goTo(currentIndex + 1)} disabled={!canRedo} title="Forward (→)">
                ▶
              </button>
              <button className="btn nav" onClick={() => goTo(moves.length)} disabled={!canRedo} title="Last move (↓)">
                ⏭
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Game</div>
            <div className="game-buttons">
              <button
                className="btn primary"
                onClick={() => {
                  newGame();
                  setEvalMap({});
                }}
              >
                New game
              </button>
              <button
                className="btn"
                onClick={() =>
                  setManualOrientation((o) => (o === "white" ? "black" : "white"))
                }
                disabled={settings.autoFlip}
                title={settings.autoFlip ? "Disable auto-flip to flip manually" : "Flip board"}
              >
                Flip board
              </button>
            </div>
            <ImportExport fen={fen} pgn={pgn} onLoadFen={loadFen} onLoadPgn={loadPgn} />
          </div>

          <div className="panel">
            <div className="panel-title">Settings</div>
            <SettingsPanel settings={settings} onChange={updateSettings} />
          </div>
        </aside>
      </main>
    </div>
  );
}
