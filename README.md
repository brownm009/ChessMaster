# ♞ ChessMaster

A personal chess practice board, inspired by chess.com's analysis tools. You
control **both sides** of the board and simulate games against yourself, with
Stockfish 18 running locally in your browser to coach you along the way.

This is a private training tool — nothing is uploaded anywhere, no account
needed, everything (including the engine) runs on your own machine.

## Features

- **Full game simulation** — play both White and Black, with legal-move
  validation, castling, en passant, promotions, check/checkmate/draw detection.
- **Best-move suggestions** — toggle an engine arrow that shows Stockfish's
  best move for the side to move (plus the move in notation and the full
  engine line in the sidebar).
- **Move feedback** — every move you play is rated like on chess.com:
  ★ Best, ! Excellent, ✓ Good, ?! Inaccuracy, ? Mistake, ?? Blunder — with
  "best was …" shown for bad moves, so you learn from every mistake.
- **Evaluation bar** — live Stockfish evaluation next to the board.
- **Opening recognition** — the name of the opening you're playing is shown
  above the board (Ruy López, Sicilian Najdorf, London System, …).
- **Move list with navigation** — click any move to jump there, step through
  with the arrow keys or the ⏮ ◀ ▶ ⏭ buttons, then branch off with a new move.
- **Practice from any position** — paste a FEN or a whole PGN game to train
  specific positions; export your game as PGN/FEN with one click.
- **Board options** — flip board, auto-flip to the side to move, legal-move
  dots, last-move highlight, coordinates on/off. Settings are remembered.

## Running it

```bash
npm install
npm run dev      # → http://localhost:5173
```

`predev`/`prebuild` automatically copy the Stockfish WASM build from
`node_modules/stockfish` into `public/engine` (git-ignored).

For a production build: `npm run build`, then `npm run preview` to serve it.

## Tech

- [Vite](https://vite.dev) + React + TypeScript
- [chess.js](https://github.com/jhlywa/chess.js) for rules and PGN/FEN
- [react-chessboard](https://github.com/Clariity/react-chessboard) for the board UI
- [Stockfish 18](https://stockfishchess.org) (lite single-threaded WASM build)
  as a Web Worker for analysis
