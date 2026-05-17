import { PIECE_IMAGES, PIECE_VALUES } from "@/lib/pieces";

interface Props {
  captured: string[]; // e.g. ["wp", "bn"]
  side: "w" | "b";
  label: string;
}

export function CapturedPanel({ captured, side, label }: Props) {
  const mine = captured.filter((p) => p.startsWith(side));
  const advantage = captured.reduce((sum, p) => {
    const v = PIECE_VALUES[p[1]];
    return sum + (p.startsWith(side) ? -v : v);
  }, 0);

  return (
    <div className="mario-card p-3 flex items-center gap-2 flex-wrap min-h-[64px]">
      <span className="text-xs font-display tracking-wider text-coin-gold uppercase">{label}</span>
      <div className="flex flex-wrap gap-1 flex-1">
        {mine.length === 0 && <span className="text-xs text-muted-foreground italic">no losses yet</span>}
        {mine.map((p, i) => (
          <img key={i} src={PIECE_IMAGES[p]} alt="" className="w-7 h-7 object-contain opacity-80" />
        ))}
      </div>
      {advantage !== 0 && (
        <span className={`text-sm font-bold ${advantage > 0 ? "text-luigi-green" : "text-mario-red"}`}>
          {advantage > 0 ? "+" : ""}{Math.round(advantage / 100)}
        </span>
      )}
    </div>
  );
}
