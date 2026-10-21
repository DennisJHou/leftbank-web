const MIN = 1;
const MAX = 9;
const pct = (v: number) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;

/** 三大類的程度：同色系的軌道與填色，旁邊用文字說明程度，不只靠顏色 */
export function Meter({
  label,
  levelLabel,
  value,
  previous,
}: {
  label: string;
  levelLabel: string;
  value: number | null;
  previous?: number | null;
}) {
  const delta = value != null && previous != null ? value - previous : null;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[16px] font-medium">{label}</span>
        <span className="text-[14px] text-stone">
          {levelLabel}
          {value != null && <span className="ml-2 tabular-nums text-ash">{value.toFixed(1)}</span>}
          {delta != null && Math.abs(delta) >= 0.05 && (
            <span className="ml-2 tabular-nums text-ash">
              {delta < 0 ? "↓" : "↑"}
              {Math.abs(delta).toFixed(1)}
            </span>
          )}
        </span>
      </div>
      <div className="relative mt-2.5 h-2 rounded-full bg-[#efe4d3]">
        {value != null && (
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#9a5f17]" style={{ width: `${Math.max(4, pct(value))}%` }} />
        )}
        {previous != null && (
          <div
            className="absolute -top-1 h-4 w-[2px] rounded-full bg-ash"
            style={{ left: `calc(${pct(previous)}% - 1px)` }}
            title={`上一次 ${previous.toFixed(1)}`}
          />
        )}
        {[3.67, 6.33].map((t) => (
          <div key={t} className="absolute inset-y-0 w-[2px] bg-canvas" style={{ left: `${pct(t)}%` }} />
        ))}
      </div>
    </div>
  );
}
