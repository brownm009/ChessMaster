import { useState } from "react";

interface ImportExportProps {
  fen: string;
  pgn: string;
  onLoadFen: (fen: string) => boolean;
  onLoadPgn: (pgn: string) => boolean;
}

export function ImportExport({ fen, pgn, onLoadFen, onLoadPgn }: ImportExportProps) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const flash = (text: string, error = false) => {
    setMessage({ text, error });
    window.setTimeout(() => setMessage(null), 3000);
  };

  const load = (kind: "fen" | "pgn") => {
    const ok = kind === "fen" ? onLoadFen(input) : onLoadPgn(input);
    if (ok) {
      setInput("");
      flash(kind === "fen" ? "Position loaded." : "Game loaded.");
    } else {
      flash(`Invalid ${kind.toUpperCase()}.`, true);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${what} copied to clipboard.`);
    } catch {
      flash(`Could not copy ${what}.`, true);
    }
  };

  return (
    <div className="import-export">
      <textarea
        className="ie-input"
        placeholder="Paste a FEN position or a PGN game here to practice from it…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        spellCheck={false}
      />
      <div className="ie-buttons">
        <button className="btn small" disabled={!input.trim()} onClick={() => load("fen")}>
          Load FEN
        </button>
        <button className="btn small" disabled={!input.trim()} onClick={() => load("pgn")}>
          Load PGN
        </button>
        <span className="ie-spacer" />
        <button className="btn small ghost" onClick={() => copy(fen, "FEN")}>
          Copy FEN
        </button>
        <button className="btn small ghost" disabled={!pgn.trim()} onClick={() => copy(pgn, "PGN")}>
          Copy PGN
        </button>
      </div>
      {message && (
        <p className={`ie-message ${message.error ? "error" : ""}`}>{message.text}</p>
      )}
    </div>
  );
}
