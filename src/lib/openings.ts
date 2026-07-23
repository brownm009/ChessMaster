// Compact opening book used to name the opening currently on the board.
// Keys are space-joined SAN sequences from the initial position; the longest
// matching prefix wins.
const OPENINGS: Record<string, string> = {
  "e4": "King's Pawn Opening",
  "d4": "Queen's Pawn Opening",
  "c4": "English Opening",
  "Nf3": "Réti Opening",
  "b3": "Nimzo-Larsen Attack",
  "f4": "Bird's Opening",
  "g3": "King's Fianchetto Opening",

  "e4 e5": "Open Game",
  "e4 e5 Nf3": "King's Knight Opening",
  "e4 e5 Nf3 Nf6": "Petrov's Defense",
  "e4 e5 Nf3 Nc6 Bb5": "Ruy López",
  "e4 e5 Nf3 Nc6 Bb5 a6": "Ruy López: Morphy Defense",
  "e4 e5 Nf3 Nc6 Bb5 Nf6": "Ruy López: Berlin Defense",
  "e4 e5 Nf3 Nc6 Bc4": "Italian Game",
  "e4 e5 Nf3 Nc6 Bc4 Bc5": "Italian Game: Giuoco Piano",
  "e4 e5 Nf3 Nc6 Bc4 Nf6": "Italian Game: Two Knights Defense",
  "e4 e5 Nf3 Nc6 d4": "Scotch Game",
  "e4 e5 Nc3": "Vienna Game",
  "e4 e5 f4": "King's Gambit",
  "e4 e5 Bc4": "Bishop's Opening",

  "e4 c5": "Sicilian Defense",
  "e4 c5 Nf3 d6": "Sicilian Defense",
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6": "Sicilian Defense: Najdorf Variation",
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6": "Sicilian Defense: Dragon Variation",
  "e4 c5 Nf3 Nc6": "Sicilian Defense: Old Sicilian",
  "e4 c5 Nf3 e6": "Sicilian Defense: French Variation",
  "e4 c5 c3": "Sicilian Defense: Alapin Variation",
  "e4 c5 Nc3": "Sicilian Defense: Closed",

  "e4 e6": "French Defense",
  "e4 e6 d4 d5": "French Defense",
  "e4 e6 d4 d5 e5": "French Defense: Advance Variation",
  "e4 e6 d4 d5 Nc3": "French Defense: Paulsen Variation",
  "e4 c6": "Caro-Kann Defense",
  "e4 c6 d4 d5 e5": "Caro-Kann Defense: Advance Variation",
  "e4 d5": "Scandinavian Defense",
  "e4 d6": "Pirc Defense",
  "e4 Nf6": "Alekhine's Defense",
  "e4 g6": "Modern Defense",

  "d4 d5": "Closed Game",
  "d4 d5 c4": "Queen's Gambit",
  "d4 d5 c4 dxc4": "Queen's Gambit Accepted",
  "d4 d5 c4 e6": "Queen's Gambit Declined",
  "d4 d5 c4 c6": "Slav Defense",
  "d4 d5 Bf4": "London System",
  "d4 d5 Nf3 Nf6 Bf4": "London System",
  "d4 Nf6": "Indian Defense",
  "d4 Nf6 Bf4": "London System",
  "d4 Nf6 c4 e6": "Indian Defense: East Indian",
  "d4 Nf6 c4 e6 Nc3 Bb4": "Nimzo-Indian Defense",
  "d4 Nf6 c4 e6 Nf3 b6": "Queen's Indian Defense",
  "d4 Nf6 c4 e6 g3": "Catalan Opening",
  "d4 Nf6 c4 g6": "King's Indian Defense",
  "d4 Nf6 c4 g6 Nc3 d5": "Grünfeld Defense",
  "d4 Nf6 c4 g6 Nc3 Bg7": "King's Indian Defense",
  "d4 Nf6 c4 c5": "Benoni Defense",
  "d4 f5": "Dutch Defense",
  "d4 e6": "Horwitz Defense",

  "c4 e5": "English Opening: Reversed Sicilian",
  "c4 c5": "English Opening: Symmetrical Variation",
  "c4 Nf6": "English Opening: Anglo-Indian Defense",
};

/** Returns the name of the longest known opening prefix, or null. */
export function detectOpening(sans: string[]): string | null {
  let best: string | null = null;
  for (let i = 1; i <= sans.length; i++) {
    const key = sans.slice(0, i).join(" ");
    const name = OPENINGS[key];
    if (name) best = name;
  }
  return best;
}
