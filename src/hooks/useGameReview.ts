import { useCallback, useEffect, useRef, useState } from "react";
import type { EvalRecord } from "../types";

const ENGINE_URL = "/engine/stockfish-18-lite-single.js";
/** Search depth per position during a full-game review. */
const REVIEW_DEPTH = 15;

export interface ReviewState {
  running: boolean;
  done: number;
  total: number;
  evals: EvalRecord[] | null;
}

/**
 * Analyzes an entire game on demand: feeds every position to a dedicated
 * Stockfish instance at a fixed depth and returns one EvalRecord per position
 * (always from White's perspective).
 */
export function useGameReview() {
  const [state, setState] = useState<ReviewState>({
    running: false,
    done: 0,
    total: 0,
    evals: null,
  });
  const workerRef = useRef<Worker | null>(null);

  const cleanup = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const run = useCallback(
    (fens: string[]) => {
      cleanup();
      let worker: Worker;
      try {
        worker = new Worker(ENGINE_URL);
      } catch {
        setState({ running: false, done: 0, total: 0, evals: null });
        return;
      }
      workerRef.current = worker;

      const results: EvalRecord[] = new Array(fens.length);
      let index = 0;
      let current: EvalRecord = { cp: null, mate: null, bestUci: null, depth: 0 };
      setState({ running: true, done: 0, total: fens.length, evals: null });

      const analyze = (i: number) => {
        current = { cp: null, mate: null, bestUci: null, depth: 0 };
        worker.postMessage("position fen " + fens[i]);
        worker.postMessage("go depth " + REVIEW_DEPTH);
      };

      worker.onmessage = (ev: MessageEvent) => {
        const line = typeof ev.data === "string" ? ev.data : "";
        if (line === "uciok") {
          worker.postMessage("isready");
        } else if (line === "readyok") {
          if (fens.length === 0) {
            setState({ running: false, done: 0, total: 0, evals: [] });
            cleanup();
            return;
          }
          analyze(0);
        } else if (line.startsWith("info ")) {
          if (line.includes("lowerbound") || line.includes("upperbound")) return;
          const depth = / depth (\d+)/.exec(line);
          const cp = / score cp (-?\d+)/.exec(line);
          const mate = / score mate (-?\d+)/.exec(line);
          const pv = / pv (\S+)/.exec(line);
          if (!depth || (!cp && !mate)) return;
          const sign = fens[index].split(" ")[1] === "b" ? -1 : 1;
          current = {
            depth: Number(depth[1]),
            cp: cp ? sign * Number(cp[1]) : null,
            mate: mate ? sign * Number(mate[1]) : null,
            bestUci: pv ? pv[1] : current.bestUci,
          };
        } else if (line.startsWith("bestmove")) {
          const best = line.split(" ")[1];
          if (best && best !== "(none)" && !current.bestUci) {
            current = { ...current, bestUci: best };
          }
          results[index] = current;
          index += 1;
          setState((s) => ({ ...s, done: index }));
          if (index < fens.length) {
            analyze(index);
          } else {
            setState({
              running: false,
              done: fens.length,
              total: fens.length,
              evals: results,
            });
            cleanup();
          }
        }
      };
      worker.postMessage("uci");
    },
    [cleanup]
  );

  const reset = useCallback(() => {
    cleanup();
    setState({ running: false, done: 0, total: 0, evals: null });
  }, [cleanup]);

  return { ...state, run, reset };
}
