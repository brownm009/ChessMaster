# ♞ ChessMaster

A personal chess practice board, inspired by chess.com's analysis tools. You
control **both sides** of the board and simulate games against yourself, with
Stockfish 18 running locally in your browser to coach you along the way.

This is a private training tool — nothing is uploaded anywhere, no account
needed, everything (including the engine) runs on your own machine.

## Features

- **Choose your side** — play as White, as Black, or control both sides
  (self-play). When you pick a colour, Stockfish automatically plays the other
  side and the board orients to your colour, like "Play vs Computer".
- **Adjustable opponent strength** — when playing against the engine, pick a
  level from Beginner (~1350) up to Maximum (full strength). The opponent runs
  on its own engine instance, so weakening it never weakens the coaching:
  best-move hints, the eval bar and move feedback always use full-strength
  Stockfish.
- **Full game simulation** — legal-move validation, castling, en passant,
  promotions, check/checkmate/draw detection.
- **Best-move suggestions** — toggle an engine arrow that shows Stockfish's
  best move for the side to move (plus the move in notation and the full
  engine line in the sidebar).
- **Move feedback** — every move you play is rated like on chess.com:
  ★ Best, ! Excellent, ✓ Good, ?! Inaccuracy, ? Mistake, ?? Blunder — with
  "best was …" shown for bad moves, so you learn from every mistake.
- **Game Review** — analyze the whole game with one click: accuracy % for
  each side, a breakdown of move quality, and clickable "key moments" that
  jump to your biggest mistakes with the move you should have played.
- **Tactics from your own mistakes** — after a review, "Train these mistakes"
  turns every blunder into a "find the best move" puzzle from the exact
  position you got wrong. Your move is checked against the engine (the best
  move *and* any equally good alternative count), with try-again, reveal, and
  a solved counter.
- **Position setup / board editor** — click "Set up position" to place pieces
  freely (piece palette, eraser, side to move, castling rights), then "Lock in
  & play" to continue a normal game from that position — with suggestions,
  feedback and the engine opponent, exactly as usual.
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
