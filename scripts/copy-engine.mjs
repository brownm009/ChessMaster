// Copies the Stockfish lite single-threaded build into public/engine so the
// app can spawn it as a classic Web Worker without COOP/COEP headers.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "stockfish", "bin");
const dest = join(root, "public", "engine");

mkdirSync(dest, { recursive: true });
for (const file of ["stockfish-18-lite-single.js", "stockfish-18-lite-single.wasm"]) {
  copyFileSync(join(src, file), join(dest, file));
}
console.log("Stockfish engine files copied to public/engine");
