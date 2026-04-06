import "../../styles/Charts.css";
import { useState, useRef, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────
// Shared Tooltip (portal-style, fixed position)
// ─────────────────────────────────────────────
function Tooltip({ visible, x, y, lines }) {
  if (!visible || !lines?.length) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: x + 14,
        top: y,
        transform: "translateY(-110%)",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    >
      <div
        style={{
          background: "#0F172A",
          color: "#fff",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 12,
          lineHeight: 1.7,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
          minWidth: 100,
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {line.color && (
              <div className="chart-tooltip-dot" style={{ background: line.color }} />
            )}
            <span style={{ color: "#94A3B8", marginRight: 2 }}>{line.label}:</span>
            <span style={{ fontWeight: 700, color: line.color || "#fff" }}>{line.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function useTooltip() {
  const [tt, setTt] = useState({ visible: false, x: 0, y: 0, lines: [] });
  const show = useCallback((e, lines) =>
    setTt({ visible: true, x: e.clientX, y: e.clientY, lines: Array.isArray(lines) ? lines : [{ label: "", value: lines }] }), []);
  const move = useCallback((e) =>
    setTt(t => ({ ...t, x: e.clientX, y: e.clientY })), []);
  const hide = useCallback(() => setTt(t => ({ ...t, visible: false })), []);
  return { tt, show, move, hide };
}

// ─────────────────────────────────────────────
// Bar Chart (vertical) — hover per bar
// ─────────────────────────────────────────────
export function BarChart({ data = [], colors, height = 180 }) {
  if (!data.length) return <Empty />;
  const { tt, show, move, hide } = useTooltip();
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...data.map(d => d.value), 1);
  const palette = colors || ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316","#84CC16"];

  return (
    <div style={{ position: "relative" }}>
      <Tooltip {...tt} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: hovered === i ? palette[i % palette.length] : "#64748B", transition: "color .15s" }}>{d.value}</span>
            <div
              style={{
                width: "100%",
                height: `${(d.value / max) * 82}%`,
                background: palette[i % palette.length],
                borderRadius: "5px 5px 0 0",
                minHeight: d.value > 0 ? 4 : 0,
                cursor: "pointer",
                transition: "filter .15s, transform .15s",
                filter: hovered === i ? "brightness(1.15)" : "none",
                transform: hovered === i ? "scaleY(1.02)" : "scaleY(1)",
                transformOrigin: "bottom",
              }}
              onMouseEnter={e => { setHovered(i); show(e, [{ label: d.label, value: d.value, color: palette[i % palette.length] }]); }}
              onMouseMove={move}
              onMouseLeave={() => { setHovered(null); hide(); }}
            />
            <span style={{ fontSize: 10, color: "#94A3B8", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Horizontal Bar Chart — hover per row
// ─────────────────────────────────────────────
export function HBarChart({ data = [], color = "#3B82F6" }) {
  if (!data.length) return <Empty />;
  const { tt, show, move, hide } = useTooltip();
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}>
      <Tooltip {...tt} />
      {data.map((d, i) => (
        <div
          key={i}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onMouseEnter={e => { setHovered(i); show(e, [{ label: d.label, value: d.value, color }]); }}
          onMouseMove={move}
          onMouseLeave={() => { setHovered(null); hide(); }}
        >
          <span style={{ width: 110, fontSize: 12, color: hovered === i ? "#1E293B" : "#475569", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0, fontWeight: hovered === i ? 600 : 400, transition: "all .15s" }}>
            {d.label}
          </span>
          <div style={{ flex: 1, background: "#F1F5F9", borderRadius: 99, height: 22, overflow: "hidden" }}>
            <div
              style={{
                width: `${(d.value / max) * 100}%`,
                height: "100%",
                background: color,
                borderRadius: 99,
                minWidth: d.value > 0 ? 4 : 0,
                transition: "filter .15s",
                filter: hovered === i ? "brightness(1.12)" : "none",
              }}
            />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, width: 36, textAlign: "right", color: hovered === i ? color : "#334155", transition: "color .15s" }}>
            {d.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Line Chart — crosshair + tooltip on hover
// ─────────────────────────────────────────────
export function LineChart({ data = [], color = "#3B82F6", height = 160 }) {
  if (!data.length) return <Empty />;
  const { tt, show, hide } = useTooltip();
  const [activeIdx, setActiveIdx] = useState(null);
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const W = 500, H = height - 36, PAD_X = 20, PAD_Y = 10;
  const max = Math.max(...data.map(d => d.value), 1);
  const pts = data.map((d, i) => ({
    x: data.length > 1 ? PAD_X + (i / (data.length - 1)) * (W - PAD_X * 2) : W / 2,
    y: PAD_Y + ((max - d.value) / max) * (H - PAD_Y * 2),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  const uid = `lc_${color.replace("#", "")}`;

  // Find closest point on mouse move
  const handleMouseMove = useCallback((e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0, minDist = Infinity;
    pts.forEach((p, i) => {
      const dist = Math.abs(p.x - svgX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setActiveIdx(closest);
    show(e, [{ label: data[closest].label, value: data[closest].value, color }]);
  }, [pts, data, color, show]);

  const handleMouseLeave = useCallback(() => {
    setActiveIdx(null);
    hide();
  }, [hide]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <Tooltip {...tt} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height, display: "block", cursor: "crosshair" }}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaPath} fill={`url(#${uid})`} />
        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Crosshair vertical line */}
        {activeIdx !== null && (
          <line
            x1={pts[activeIdx].x} y1={PAD_Y}
            x2={pts[activeIdx].x} y2={H}
            stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
          />
        )}
        {/* Dots — always small, active = big */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y}
            r={activeIdx === i ? 6 : 4}
            fill={activeIdx === i ? color : "white"}
            stroke={color}
            strokeWidth={activeIdx === i ? 0 : 2}
            style={{ transition: "r .1s" }}
          />
        ))}
        {/* Active point label */}
        {activeIdx !== null && (
          <text
            x={pts[activeIdx].x}
            y={pts[activeIdx].y - 12}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={color}
          >
            {data[activeIdx].value}
          </text>
        )}
      </svg>
      {/* X-axis labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingLeft: PAD_X, paddingRight: PAD_X }}>
        {data.map((d, i) => (
          <span key={i} style={{ fontSize: 10, color: activeIdx === i ? color : "#94A3B8", fontWeight: activeIdx === i ? 700 : 400, transition: "color .15s" }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Donut Chart — hover per slice
// ─────────────────────────────────────────────
export function DonutChart({ data = [], size = 160 }) {
  if (!data.length) return <Empty />;
  const { tt, show, move, hide } = useTooltip();
  const [hovered, setHovered] = useState(null);
  const palette = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316"];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 50, cx = 60, cy = 60, sw = 20, circ = 2 * Math.PI * R;
  let offset = 0;
  const slices = data.map((d, i) => {
    const s = { ...d, dash: (d.value / total) * circ, offset, color: d.color || palette[i % palette.length] };
    offset += s.dash;
    return s;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", position: "relative" }}>
      <Tooltip {...tt} />
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <circle
            key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={s.color} strokeWidth={hovered === i ? sw + 4 : sw}
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: `${cx}px ${cy}px`,
              cursor: "pointer",
              transition: "stroke-width .15s",
            }}
            onMouseEnter={e => { setHovered(i); show(e, [{ label: s.label, value: s.value, color: s.color }, { label: "Share", value: `${Math.round((s.value/total)*100)}%` }]); }}
            onMouseMove={move}
            onMouseLeave={() => { setHovered(null); hide(); }}
          />
        ))}
        {/* Center text */}
        {hovered !== null ? (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="800" fill={slices[hovered]?.color || "#111"}>{slices[hovered]?.value}</text>
            <text x={cx} y={cy + 9} textAnchor="middle" fontSize="8" fill="#94A3B8">{Math.round((slices[hovered]?.value/total)*100)}%</text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#111827">{total}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#94A3B8">total</text>
          </>
        )}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {slices.map((s, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: hovered !== null && hovered !== i ? 0.45 : 1, transition: "opacity .15s" }}
            onMouseEnter={e => { setHovered(i); show(e, [{ label: s.label, value: s.value, color: s.color }, { label: "Share", value: `${Math.round((s.value/total)*100)}%` }]); }}
            onMouseMove={move}
            onMouseLeave={() => { setHovered(null); hide(); }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#374151" }}>{s.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginLeft: "auto", paddingLeft: 16 }}>{Math.round((s.value/total)*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Scatter Chart — hover per dot
// ─────────────────────────────────────────────
export function ScatterChart({ data = [], xLabel = "X", yLabel = "Y", color = "#3B82F6" }) {
  if (!data.length) return <Empty />;
  const { tt, show, move, hide } = useTooltip();
  const [hovered, setHovered] = useState(null);
  const W = 400, H = 180, pad = 32;
  const maxX = Math.max(...data.map(d => d.x), 1);
  const maxY = Math.max(...data.map(d => d.y), 1);

  return (
    <div style={{ position: "relative" }}>
      <Tooltip {...tt} />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={pad} y1={(H-pad)*t + 4} x2={W-8} y2={(H-pad)*t + 4} stroke="#F1F5F9" strokeWidth="1" />
        ))}
        <line x1={pad} y1={H-pad} x2={W-8}  y2={H-pad} stroke="#E2E8F0" strokeWidth="1" />
        <line x1={pad} y1={8}     x2={pad}   y2={H-pad} stroke="#E2E8F0" strokeWidth="1" />
        {data.map((d, i) => {
          const cx = pad + (d.x / maxX) * (W - pad - 16);
          const cy = (H - pad) - (d.y / maxY) * (H - pad - 16);
          return (
            <g key={i}>
              {hovered === i && (
                <>
                  <line x1={pad} y1={cy} x2={cx} y2={cy} stroke={color} strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
                  <line x1={cx} y1={H-pad} x2={cx} y2={cy} stroke={color} strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
                </>
              )}
              <circle
                cx={cx} cy={cy}
                r={hovered === i ? 9 : 6}
                fill={color} fillOpacity={hovered === i ? 1 : 0.7}
                stroke="white" strokeWidth="2"
                style={{ cursor: "pointer", transition: "r .1s" }}
                onMouseEnter={e => { setHovered(i); show(e, [{ label: d.name || d.label, value: "" }, { label: xLabel, value: d.x, color }, { label: yLabel, value: d.y, color: "#10B981" }]); }}
                onMouseMove={move}
                onMouseLeave={() => { setHovered(null); hide(); }}
              />
              <text x={cx} y={cy - 12} textAnchor="middle" fontSize="9" fill={hovered === i ? color : "#94A3B8"} fontWeight={hovered === i ? "700" : "400"}>
                {d.name || d.label}
              </text>
            </g>
          );
        })}
        <text x={W/2} y={H-4} textAnchor="middle" fontSize="10" fill="#94A3B8">{xLabel}</text>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// Stacked Bar Chart — hover per bar
// ─────────────────────────────────────────────
export function StackedBarChart({ data = [], keys = [], colors = [], height = 180 }) {
  if (!data.length) return <Empty />;
  const { tt, show, move, hide } = useTooltip();
  const [hovered, setHovered] = useState(null);
  const totals = data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0));
  const max = Math.max(...totals, 1);

  return (
    <div style={{ position: "relative" }}>
      <Tooltip {...tt} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end", cursor: "pointer" }}
            onMouseEnter={e => {
              setHovered(i);
              show(e, [
                { label: d.label, value: totals[i] },
                ...keys.map((k, ki) => ({ label: k, value: d[k] || 0, color: colors[ki % colors.length] }))
              ]);
            }}
            onMouseMove={move}
            onMouseLeave={() => { setHovered(null); hide(); }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: hovered === i ? "#1E293B" : "#64748B", transition: "color .15s" }}>{totals[i]}</span>
            <div
              style={{
                width: "100%",
                height: `${(totals[i] / max) * 82}%`,
                display: "flex",
                flexDirection: "column-reverse",
                borderRadius: "5px 5px 0 0",
                overflow: "hidden",
                minHeight: totals[i] > 0 ? 4 : 0,
                transition: "filter .15s",
                filter: hovered === i ? "brightness(1.1)" : "none",
              }}
            >
              {keys.map((k, ki) => (
                <div
                  key={k}
                  style={{
                    width: "100%",
                    height: `${totals[i] > 0 ? ((d[k] || 0) / totals[i]) * 100 : 0}%`,
                    background: colors[ki % colors.length],
                    minHeight: (d[k] || 0) > 0 ? 2 : 0,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 10, color: hovered === i ? "#1E293B" : "#94A3B8", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color .15s" }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
        {keys.map((k, i) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length] }} />
            <span style={{ fontSize: 11, color: "#64748B" }}>{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────
export function StatCard({ icon, label, value, delta, color = "#3B82F6" }) {
  return (
    <div className="chart-stat-card">
      <div className="chart-stat-top">
        <div className="chart-stat-icon" style={{ background: color + "15" }}>
          {icon}
        </div>
        {delta && (
          <span className="chart-stat-delta">{delta}</span>
        )}
      </div>
      <div>
        <div className="chart-stat-value">{typeof value === "number" ? value.toLocaleString() : (value ?? "—")}</div>
        <div className="chart-stat-label">{label}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Chart Card wrapper
// ─────────────────────────────────────────────
export function ChartCard({ title, subtitle, children, action }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">{title}</div>
          {subtitle && <div className="chart-card-subtitle">{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Rank Badge
// ─────────────────────────────────────────────
export function RankBadge({ rank }) {
  const cls = rank === 1 ? "chart-rank-1" : rank === 2 ? "chart-rank-2" : rank === 3 ? "chart-rank-3" : "";
  return (
    <span className={`chart-rank-badge ${cls}`}>
      {rank}
    </span>
  );
}

// ─────────────────────────────────────────────
// Loading spinner
// ─────────────────────────────────────────────
export function Loader() {
  return (
    <div className="chart-loader">
      <div className="chart-loader-spinner" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
function Empty() {
  return <div style={{ textAlign: "center", padding: "32px 0", color: "#CBD5E1", fontSize: 13 }}>No data available</div>;
}
