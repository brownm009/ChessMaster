import type { PlayAs } from "../types";

interface PlayAsSelectorProps {
  value: PlayAs;
  onChange: (value: PlayAs) => void;
}

const OPTIONS: { value: PlayAs; label: string; hint: string }[] = [
  { value: "white", label: "♔ White", hint: "You play White, the engine plays Black" },
  { value: "black", label: "♚ Black", hint: "You play Black, the engine plays White" },
  { value: "both", label: "Both", hint: "You control both sides (self-play)" },
];

export function PlayAsSelector({ value, onChange }: PlayAsSelectorProps) {
  return (
    <div className="playas">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`playas-btn ${value === opt.value ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
          title={opt.hint}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
