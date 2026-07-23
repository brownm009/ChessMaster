import { useEffect, useRef, useState } from "react";

const ENGINE_URL = "/engine/stockfish-18-lite-single.js";
/** How long the opponent thinks per move. */
const MOVE_TIME_MS = 1200;

export interface OpponentMove {
  fen: string;
  uci: string;
}

/**
 * A second Stockfish instance that plays as the engine opponent, separate from
 * the full-strength analysis engine. When `fen` is non-null it searches that
 * position and returns a move, throttled to the requested Elo (null = full
 * strength). Pass null when it is not the opponent's turn.
 */
export function useOpponent(fen: string | null, elo: number | null) {
  const [move, setMove] = useState<OpponentMove | null>(null);
  const requestRef = useRef<(fen: string | null, elo: number | null) => void>(
    () => {}
  );
  const lastRef = useRef<{ fen: string | null; elo: number | null }>({ fen, elo });

  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker(ENGINE_URL);
    } catch {
      return;
    }

    let ready = false;
    let searching = false;
    // The position currently being searched (null = idle).
    let searchFen: string | null = null;
    // The latest requested target; a search always converges on this.
    let desiredFen: string | null = lastRef.current.fen;
    let desiredElo: number | null = lastRef.current.elo;

    const applyStrength = (e: number | null) => {
      if (e === null) {
        worker.postMessage("setoption name UCI_LimitStrength value false");
      } else {
        worker.postMessage("setoption name UCI_LimitStrength value true");
        worker.postMessage("setoption name UCI_Elo value " + e);
      }
    };

    const startIfPossible = () => {
      if (!ready || searching || desiredFen === null) return;
      searching = true;
      searchFen = desiredFen;
      applyStrength(desiredElo);
      worker.postMessage("position fen " + desiredFen);
      worker.postMessage("go movetime " + MOVE_TIME_MS);
    };

    requestRef.current = (f, e) => {
      desiredFen = f;
      desiredElo = e;
      if (searching) {
        // Abandon the in-flight search; the bestmove handler restarts on target.
        if (f !== searchFen) worker.postMessage("stop");
        return;
      }
      startIfPossible();
    };

    worker.onmessage = (ev: MessageEvent) => {
      const line = typeof ev.data === "string" ? ev.data : "";
      if (line === "uciok") {
        worker.postMessage("isready");
      } else if (line === "readyok" && !ready) {
        ready = true;
        startIfPossible();
      } else if (line.startsWith("bestmove")) {
        searching = false;
        const finished = searchFen;
        searchFen = null;
        // Target moved on while we searched — search the new one instead.
        if (desiredFen !== finished) {
          startIfPossible();
          return;
        }
        const best = line.split(" ")[1];
        if (finished && best && best !== "(none)") {
          setMove({ fen: finished, uci: best });
        }
      }
    };
    worker.postMessage("uci");

    return () => {
      requestRef.current = () => {};
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    lastRef.current = { fen, elo };
    requestRef.current(fen, elo);
  }, [fen, elo]);

  return move;
}
