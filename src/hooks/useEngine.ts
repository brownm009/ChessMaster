import { useEffect, useRef, useState } from "react";

export interface Analysis {
  /** Position this analysis belongs to. */
  fen: string;
  depth: number;
  /** Centipawns from White's perspective. */
  cp: number | null;
  /** Moves until mate from White's perspective (positive = White mates). */
  mate: number | null;
  /** Best move in UCI notation, e.g. "e2e4" or "e7e8q". */
  bestUci: string | null;
  /** Principal variation in UCI notation. */
  pv: string[];
  /** True once the search finished. */
  done: boolean;
}

export type EngineStatus = "loading" | "ready" | "error";

const ENGINE_URL = "/engine/stockfish-18-lite-single.js";
const GO_COMMAND = "go movetime 3000 depth 26";

/**
 * Runs Stockfish in a Web Worker and analyzes `fen` whenever it changes.
 * Pass null to pause analysis. Only one search runs at a time; a new fen
 * stops the current search and queues the latest position.
 */
export function useEngine(fen: string | null) {
  const [status, setStatus] = useState<EngineStatus>("loading");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const requestRef = useRef<(fen: string | null) => void>(() => {});
  const lastFenRef = useRef<string | null>(fen);

  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker(ENGINE_URL);
    } catch {
      setStatus("error");
      return;
    }

    let ready = false;
    let searching = false;
    let searchFen: string | null = null;
    let pendingFen: string | null = null;
    let hasPending = false;

    const start = (f: string) => {
      searching = true;
      searchFen = f;
      setAnalysis({
        fen: f,
        depth: 0,
        cp: null,
        mate: null,
        bestUci: null,
        pv: [],
        done: false,
      });
      worker.postMessage("position fen " + f);
      worker.postMessage(GO_COMMAND);
    };

    requestRef.current = (f) => {
      if (f === searchFen && searching) return;
      if (!ready || searching) {
        pendingFen = f;
        hasPending = true;
        if (searching) worker.postMessage("stop");
        return;
      }
      if (f) start(f);
      else searchFen = null;
    };

    const handleInfo = (line: string) => {
      if (!searchFen) return;
      if (line.includes("lowerbound") || line.includes("upperbound")) return;
      const depth = / depth (\d+)/.exec(line);
      const cp = / score cp (-?\d+)/.exec(line);
      const mate = / score mate (-?\d+)/.exec(line);
      const pv = / pv (.+)$/.exec(line);
      if (!depth || (!cp && !mate)) return;
      // UCI scores are from the side to move; normalize to White's perspective.
      const sign = searchFen.split(" ")[1] === "b" ? -1 : 1;
      const fenForUpdate = searchFen;
      const pvMoves = pv ? pv[1].split(" ") : [];
      setAnalysis((prev) => {
        if (!prev || prev.fen !== fenForUpdate) return prev;
        return {
          ...prev,
          depth: Number(depth[1]),
          cp: cp ? sign * Number(cp[1]) : null,
          mate: mate ? sign * Number(mate[1]) : null,
          bestUci: pvMoves[0] ?? prev.bestUci,
          pv: pvMoves.length ? pvMoves : prev.pv,
        };
      });
    };

    const handleBestmove = (line: string) => {
      searching = false;
      const finishedFen = searchFen;
      const best = line.split(" ")[1];
      if (hasPending) {
        const next = pendingFen;
        hasPending = false;
        pendingFen = null;
        searchFen = null;
        if (next) start(next);
        return;
      }
      setAnalysis((prev) => {
        if (!prev || prev.fen !== finishedFen) return prev;
        return {
          ...prev,
          bestUci: best && best !== "(none)" ? best : prev.bestUci,
          done: true,
        };
      });
    };

    worker.onerror = () => setStatus("error");
    worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : "";
      if (line === "uciok") {
        worker.postMessage("isready");
      } else if (line === "readyok" && !ready) {
        ready = true;
        setStatus("ready");
        const f = lastFenRef.current;
        if (f) start(f);
      } else if (line.startsWith("info ")) {
        if (searching) handleInfo(line);
      } else if (line.startsWith("bestmove")) {
        handleBestmove(line);
      }
    };
    worker.postMessage("uci");

    return () => {
      requestRef.current = () => {};
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    lastFenRef.current = fen;
    requestRef.current(fen);
  }, [fen]);

  return { status, analysis };
}
