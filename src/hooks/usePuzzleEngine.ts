import { useCallback, useEffect, useRef } from "react";

const ENGINE_URL = "/engine/stockfish-18-lite-single.js";
const VERIFY_DEPTH = 13;

export interface PositionEval {
  /** Centipawns from White's perspective (null if mate). */
  cp: number | null;
  /** Moves to mate from White's perspective (null if none). */
  mate: number | null;
}

interface Job {
  fen: string;
  resolve: (value: PositionEval) => void;
}

/**
 * A lightweight, promise-based Stockfish instance used to verify puzzle
 * attempts: evaluate(fen) resolves with the position's score once the search
 * reaches a fixed depth. Jobs run one at a time in FIFO order.
 */
export function usePuzzleEngine() {
  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<Job[]>([]);
  const activeRef = useRef<Job | null>(null);
  const currentRef = useRef<PositionEval>({ cp: null, mate: null });

  useEffect(() => {
    let worker: Worker;
    try {
      worker = new Worker(ENGINE_URL);
    } catch {
      return;
    }
    workerRef.current = worker;

    const startNext = () => {
      if (activeRef.current || queueRef.current.length === 0) return;
      const job = queueRef.current.shift()!;
      activeRef.current = job;
      currentRef.current = { cp: null, mate: null };
      worker.postMessage("position fen " + job.fen);
      worker.postMessage("go depth " + VERIFY_DEPTH);
    };

    worker.onmessage = (ev: MessageEvent) => {
      const line = typeof ev.data === "string" ? ev.data : "";
      if (line === "uciok") {
        worker.postMessage("isready");
      } else if (line === "readyok") {
        readyRef.current = true;
        startNext();
      } else if (line.startsWith("info ")) {
        if (!activeRef.current) return;
        if (line.includes("lowerbound") || line.includes("upperbound")) return;
        const cp = / score cp (-?\d+)/.exec(line);
        const mate = / score mate (-?\d+)/.exec(line);
        if (!cp && !mate) return;
        const sign = activeRef.current.fen.split(" ")[1] === "b" ? -1 : 1;
        currentRef.current = {
          cp: cp ? sign * Number(cp[1]) : null,
          mate: mate ? sign * Number(mate[1]) : null,
        };
      } else if (line.startsWith("bestmove")) {
        const job = activeRef.current;
        activeRef.current = null;
        job?.resolve(currentRef.current);
        startNext();
      }
    };
    worker.postMessage("uci");

    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
      queueRef.current = [];
      activeRef.current = null;
    };
  }, []);

  const evaluate = useCallback((fen: string) => {
    return new Promise<PositionEval>((resolve) => {
      queueRef.current.push({ fen, resolve });
      // Kick the queue if the worker is idle and ready.
      if (readyRef.current && !activeRef.current && workerRef.current) {
        const job = queueRef.current.shift()!;
        activeRef.current = job;
        currentRef.current = { cp: null, mate: null };
        workerRef.current.postMessage("position fen " + job.fen);
        workerRef.current.postMessage("go depth " + VERIFY_DEPTH);
      }
    });
  }, []);

  return { evaluate };
}
