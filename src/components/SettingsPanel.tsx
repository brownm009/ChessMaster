import type { Settings } from "../types";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

const OPTIONS: { key: keyof Settings; label: string; hint: string }[] = [
  {
    key: "showBestMove",
    label: "Suggest best move",
    hint: "Show the engine's best move as an arrow on the board",
  },
  {
    key: "moveFeedback",
    label: "Move feedback",
    hint: "Rate every move you play (best, good, mistake, blunder …)",
  },
  {
    key: "showEvalBar",
    label: "Evaluation bar",
    hint: "Show who is better next to the board",
  },
  {
    key: "highlightLegal",
    label: "Show legal moves",
    hint: "Mark the squares the selected piece can move to",
  },
  {
    key: "highlightLast",
    label: "Highlight last move",
    hint: "Keep the previous move highlighted on the board",
  },
  {
    key: "showCoordinates",
    label: "Board coordinates",
    hint: "Show file and rank labels on the board",
  },
  {
    key: "autoFlip",
    label: "Auto-flip board",
    hint: "Rotate the board so the side to move is always at the bottom",
  },
];

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      {OPTIONS.map((opt) => (
        <label className="setting-row" key={opt.key} title={opt.hint}>
          <span className="setting-label">{opt.label}</span>
          <span
            className={`toggle ${settings[opt.key] ? "on" : ""}`}
            role="switch"
            aria-checked={settings[opt.key]}
          >
            <input
              type="checkbox"
              checked={settings[opt.key]}
              onChange={(e) => onChange({ [opt.key]: e.target.checked })}
            />
            <span className="toggle-knob" />
          </span>
        </label>
      ))}
    </div>
  );
}
