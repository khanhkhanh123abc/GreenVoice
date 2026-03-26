// Pure React chart components — no external chart library needed

// ── Bar Chart (vertical) ──
export function BarChart({ data = [], colors, height = 180 }) {
  if (!data.length) return <Empty />;
  const max = Math.max(...data.map(d => d.value), 1);
  const palette = colors || ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316","#84CC16"];
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <span className="text-xs font-semibold text-slate-600">{d.value}</span>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{ height: `${(d.value / max) * 80}%`, background: palette[i % palette.length], minHeight: d.value > 0 ? 4 : 0 }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[10px] text-slate-400 text-center leading-tight truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Horizontal Bar Chart ──
export function HBarChart({ data = [], color = "#3B82F6" }) {
  if (!data.length) return <Empty />;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-slate-600 text-right truncate shrink-0" style={{ width: 110 }}>{d.label}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: color, minWidth: d.value > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-xs font-bold text-slate-700 w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Line Chart (SVG) ──
export function LineChart({ data = [], color = "#3B82F6", height = 160 }) {
  if (!data.length) return <Empty />;
  const W = 500, H = height - 32;
  const max = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * W : W / 2,
    y: H - (d.value / max) * (H - 8),
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const uid = color.replace("#", "g");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 4}`} style={{ width: "100%", height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${uid})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between mt-1 px-1">
        {data.map((d, i) => <span key={i} className="text-[10px] text-slate-400">{d.label}</span>)}
      </div>
    </div>
  );
}

// ── Donut Chart (SVG) ──
export function DonutChart({ data = [], size = 160 }) {
  if (!data.length) return <Empty />;
  const palette = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316"];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 50, cx = 60, cy = 60, sw = 20, circ = 2 * Math.PI * R;
  let offset = 0;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const s = { ...d, dash: pct * circ, offset, color: d.color || palette[i % palette.length] };
    offset += s.dash;
    return s;
  });
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg width={size} height={size} viewBox="0 0 120 120">
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={s.color} strokeWidth={sw}
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#111827">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fill="#9CA3AF">total</text>
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-slate-600">{s.label}</span>
            <span className="text-xs font-bold text-slate-800 ml-auto pl-4">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Scatter Chart (SVG) ──
export function ScatterChart({ data = [], xLabel = "X", yLabel = "Y", color = "#3B82F6" }) {
  if (!data.length) return <Empty />;
  const W = 400, H = 180, pad = 32;
  const maxX = Math.max(...data.map(d => d.x), 1);
  const maxY = Math.max(...data.map(d => d.y), 1);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
        <line x1={pad} y1={H - pad} x2={W - 8} y2={H - pad} stroke="#E5E7EB" strokeWidth="1" />
        <line x1={pad} y1={8} x2={pad} y2={H - pad} stroke="#E5E7EB" strokeWidth="1" />
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={pad + (d.x / maxX) * (W - pad - 16)}
              cy={(H - pad) - (d.y / maxY) * (H - pad - 16)}
              r="6" fill={color} fillOpacity="0.75" stroke={color} strokeWidth="1.5"
            />
            <text
              x={pad + (d.x / maxX) * (W - pad - 16)}
              y={(H - pad) - (d.y / maxY) * (H - pad - 16) - 10}
              textAnchor="middle" fontSize="9" fill="#6B7280">{d.label}</text>
          </g>
        ))}
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#9CA3AF">{xLabel}</text>
      </svg>
    </div>
  );
}

// ── Stacked Bar Chart ──
export function StackedBarChart({ data = [], keys = [], colors = [], height = 180 }) {
  if (!data.length) return <Empty />;
  const totals = data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0));
  const max = Math.max(...totals, 1);
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className="w-full rounded-t-md overflow-hidden flex flex-col-reverse"
              style={{ height: `${(totals[i] / max) * 82}%`, minHeight: totals[i] > 0 ? 4 : 0 }}
            >
              {keys.map((k, ki) => (
                <div
                  key={k}
                  style={{ background: colors[ki % colors.length], height: `${totals[i] > 0 ? ((d[k] || 0) / totals[i]) * 100 : 0}%`, minHeight: (d[k] || 0) > 0 ? 2 : 0 }}
                  title={`${k}: ${d[k] || 0}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 text-center truncate w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {keys.map((k, i) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="text-xs text-slate-500">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat Card ──
export function StatCard({ icon, label, value, delta, color = "#3B82F6" }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: color + "15" }}>
          {icon}
        </div>
        {delta && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">{delta}</span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{typeof value === "number" ? value.toLocaleString() : (value ?? "—")}</div>
        <div className="text-xs text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  );
}

// ── Chart Card wrapper ──
export function ChartCard({ title, subtitle, children, action }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Rank Badge ──
export function RankBadge({ rank }) {
  const styles = {
    1: "bg-yellow-100 text-yellow-700",
    2: "bg-slate-100 text-slate-600",
    3: "bg-orange-100 text-orange-600",
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${styles[rank] || "text-slate-400"}`}>
      {rank}
    </span>
  );
}

// ── Loading ──
export function Loader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

// ── Empty ──
function Empty() {
  return <div className="text-center py-10 text-slate-300 text-sm">No data available</div>;
}