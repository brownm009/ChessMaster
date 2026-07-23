interface EvalBarProps {
  cp: number | null;
  mate: number | null;
  orientation: "white" | "black";
}

export function EvalBar({ cp, mate, orientation }: EvalBarProps) {
  let whitePct: number;
  if (mate !== null) {
    whitePct = mate > 0 ? 100 : mate < 0 ? 0 : 50;
  } else if (cp === null) {
    whitePct = 50;
  } else {
    whitePct = 100 / (1 + Math.exp(-cp / 400));
  }

  let label: string;
  if (mate !== null) label = mate === 0 ? "#" : `M${Math.abs(mate)}`;
  else if (cp === null) label = "0.0";
  else label = Math.abs(cp / 100).toFixed(1);

  const whiteOnTop = orientation === "black";
  const whiteAdvantage = mate !== null ? mate > 0 : (cp ?? 0) >= 0;

  return (
    <div className="eval-bar" title="Engine evaluation">
      <div
        className="eval-bar-track"
        style={{ flexDirection: whiteOnTop ? "column-reverse" : "column" }}
      >
        <div
          className="eval-bar-black"
          style={{ height: `${100 - whitePct}%` }}
        />
        <div className="eval-bar-white" style={{ height: `${whitePct}%` }} />
      </div>
      <span
        className={`eval-bar-label ${whiteAdvantage ? "on-white" : "on-black"}`}
        style={{
          [whiteAdvantage !== whiteOnTop ? "bottom" : "top"]: "4px",
        }}
      >
        {label}
      </span>
    </div>
  );
}
