"use client";

import { useMemo, useState } from "react";
import type { AppUser, Complaint, Onu } from "@/lib/types";

const STATUS_ORDER = ["IN_STOCK", "ASSIGNED", "INSTALLED", "FAULTY", "RETURNED"] as const;
// Reuses the same semantic status colors used everywhere else in the app
// (Stock table, badges) — status is a reserved palette, never repurposed.
const STATUS_HEX: Record<string, string> = {
  IN_STOCK: "#a3a3a3",
  ASSIGNED: "#d97706",
  INSTALLED: "#16a34a",
  FAULTY: "#dc2626",
  RETURNED: "#2563eb",
};
const CHART_HUE = "#4338ca"; // single-series magnitude chart hue (office accent)

export default function AnalyticsDashboard({
  onus,
  complaints,
  users,
}: {
  onus: Onu[];
  complaints: Complaint[];
  users: AppUser[];
}) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STATUS_ORDER) counts[s] = 0;
    for (const o of onus) counts[o.status] = (counts[o.status] ?? 0) + 1;
    return counts;
  }, [onus]);

  const installsByDay = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = new Map<string, number>();

    for (const o of onus) {
      if (!o.installation?.installedAt) continue;
      const d = new Date(o.installation.installedAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return days;
  }, [onus]);

  const staffLeaderboard = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const o of onus) {
      if (o.status !== "INSTALLED" || !o.assignedTo) continue;
      const existing = counts.get(o.assignedTo.id);
      if (existing) existing.count++;
      else counts.set(o.assignedTo.id, { name: o.assignedTo.name, count: 1 });
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [onus]);

  const totalOnus = onus.length;
  const activeComplaints = complaints.filter((c) => c.status !== "RESOLVED").length;
  const staffCount = users.filter((u) => u.role === "STAFF").length;
  const LOW_STOCK_THRESHOLD = 5;
  const lowStock = statusCounts.IN_STOCK < LOW_STOCK_THRESHOLD;

  return (
    <div className="space-y-4">
      {lowStock && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="text-base">⚠️</span>
          <span>
            <strong>Low stock:</strong> only {statusCounts.IN_STOCK} ONU
            {statusCounts.IN_STOCK === 1 ? "" : "s"} available (below the{" "}
            {LOW_STOCK_THRESHOLD}-unit threshold). Add more stock soon.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total ONUs" value={totalOnus} />
        <StatTile label="Installed" value={statusCounts.INSTALLED} />
        <StatTile label="In stock" value={statusCounts.IN_STOCK} warn={lowStock} />
        <StatTile label="Active complaints" value={activeComplaints} warn={activeComplaints > 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="ONU status breakdown">
          <StatusBarChart counts={statusCounts} total={totalOnus} />
        </ChartCard>

        <ChartCard title={`Staff leaderboard (installs, ${staffCount} staff)`}>
          {staffLeaderboard.length === 0 ? (
            <EmptyChart text="No installs recorded yet." />
          ) : (
            <LeaderboardChart data={staffLeaderboard} />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Installs — last 30 days">
        <InstallsLineChart data={installsByDay} />
      </ChartCard>
    </div>
  );
}

function StatTile({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <p className="text-xs text-neutral-600">{label}</p>
      <p className={`text-2xl font-semibold ${warn ? "text-amber-600" : "text-neutral-900"}`}>
        {value}
      </p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-neutral-600">{text}</p>;
}

// Horizontal bar chart, one row per status — categorical identity, fixed
// semantic colors, direct count labels (never color-alone).
function StatusBarChart({ counts, total }: { counts: Record<string, number>; total: number }) {
  const max = Math.max(...Object.values(counts), 1);
  return (
    <div className="space-y-2">
      {STATUS_ORDER.map((status) => {
        const count = counts[status] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={status} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-medium text-neutral-700">
              {status.replace("_", " ")}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-neutral-100">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${(count / max) * 100}%`,
                  backgroundColor: STATUS_HEX[status],
                  minWidth: count > 0 ? "4px" : 0,
                }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs text-neutral-600">
              {count} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal bar chart ranking staff by install count — single hue (this is
// a magnitude comparison, not an identity chart; labels distinguish staff).
function LeaderboardChart({ data }: { data: { name: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2">
          <span className="w-24 shrink-0 truncate text-xs font-medium text-neutral-700">
            {d.name}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-neutral-100">
            <div
              className="h-full rounded"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: CHART_HUE }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs text-neutral-600">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// Line chart with crosshair + tooltip on hover, one axis, one series.
function InstallsLineChart({ data }: { data: { date: string; count: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 640;
  const height = 160;
  const padding = { top: 10, right: 10, bottom: 20, left: 24 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.count), 1);

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * innerW,
    y: padding.top + innerH - (d.count / max) * innerH,
    ...d,
  }));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1].x},${padding.top + innerH} L${points[0].x},${padding.top + innerH} Z`;

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * width;
          const idx = Math.round(((relX - padding.left) / innerW) * (data.length - 1));
          setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* recessive gridline */}
        <line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={width - padding.right}
          y2={padding.top + innerH}
          stroke="#e5e5e5"
        />
        <path d={areaPath} fill={CHART_HUE} opacity={0.08} />
        <path d={path} fill="none" stroke={CHART_HUE} strokeWidth={2} strokeLinejoin="round" />
        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={padding.top}
              x2={hovered.x}
              y2={padding.top + innerH}
              stroke="#d4d4d4"
              strokeWidth={1}
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill={CHART_HUE} stroke="white" strokeWidth={2} />
          </>
        )}
        <text x={padding.left} y={height - 4} className="fill-neutral-600 text-[9px]">
          {formatShortDate(data[0].date)}
        </text>
        <text
          x={width - padding.right}
          y={height - 4}
          textAnchor="end"
          className="fill-neutral-600 text-[9px]"
        >
          {formatShortDate(data[data.length - 1].date)}
        </text>
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md bg-neutral-900 px-2 py-1 text-xs text-white"
          style={{
            left: `${(hovered.x / width) * 100}%`,
            top: `${(hovered.y / height) * 100}%`,
          }}
        >
          {formatShortDate(hovered.date)}: {hovered.count} install{hovered.count === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
