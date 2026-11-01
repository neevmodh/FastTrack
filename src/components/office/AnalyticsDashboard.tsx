"use client";

import { useEffect, useMemo, useState } from "react";
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
// Complaint status is a separate domain from ONU status, but reuses the
// same semantic meaning (amber = needs attention, blue = in motion,
// green = done) rather than inventing a clashing new palette.
const COMPLAINT_HEX: Record<string, string> = {
  OPEN: "#d97706",
  IN_PROGRESS: "#2563eb",
  RESOLVED: "#16a34a",
};
const CHART_HUE = "#4338ca"; // single-series magnitude chart hue (office accent)

const RANGE_DAYS: Record<"7" | "30" | "90", number> = { "7": 7, "30": 30, "90": 90 };

export default function AnalyticsDashboard({
  onus,
  complaints,
  users,
}: {
  onus: Onu[];
  complaints: Complaint[];
  users: AppUser[];
}) {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [customerTotal, setCustomerTotal] = useState<number | null>(null);
  const [customerWithInstall, setCustomerWithInstall] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCustomerCounts() {
      const [totalRes, withInstallRes] = await Promise.all([
        fetch("/api/customers?take=0"),
        fetch("/api/customers?take=0&hasInstalls=yes"),
      ]);
      if (cancelled) return;
      if (totalRes.ok) setCustomerTotal((await totalRes.json()).total);
      if (withInstallRes.ok) setCustomerWithInstall((await withInstallRes.json()).total);
    }
    loadCustomerCounts();
    return () => {
      cancelled = true;
    };
  }, []);

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

    const n = RANGE_DAYS[range];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return days;
  }, [onus, range]);

  const trendTotal = useMemo(
    () => installsByDay.reduce((sum, d) => sum + d.count, 0),
    [installsByDay]
  );

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

  const companyBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of onus) counts.set(o.companyName, (counts.get(o.companyName) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [onus]);

  const complaintBreakdown = useMemo(() => {
    const counts: Record<string, number> = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
    for (const c of complaints) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [complaints]);

  const totalOnus = onus.length;
  const activeComplaints = complaints.filter((c) => c.status !== "RESOLVED").length;
  const staffCount = users.filter((u) => u.role === "STAFF").length;
  const LOW_STOCK_THRESHOLD = 5;
  const lowStock = statusCounts.IN_STOCK < LOW_STOCK_THRESHOLD;

  return (
    <div className="space-y-4">
      {lowStock && (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 border-l-[3px] border-l-amber-500 bg-white px-4 py-3 text-sm">
          <svg className="h-4 w-4 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-neutral-700">
            <strong className="text-neutral-900">Low stock —</strong> only{" "}
            <span className="data">{statusCounts.IN_STOCK}</span> ONU
            {statusCounts.IN_STOCK === 1 ? "" : "s"} available, below the{" "}
            {LOW_STOCK_THRESHOLD}-unit threshold.
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
        <ChartCard title="Status breakdown">
          <StatusBarChart counts={statusCounts} total={totalOnus} />
        </ChartCard>

        <ChartCard title={`Leaderboard — installs (${staffCount} staff)`}>
          {staffLeaderboard.length === 0 ? (
            <EmptyChart text="No installs recorded yet." />
          ) : (
            <LeaderboardChart data={staffLeaderboard} />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title={`Installs — last ${RANGE_DAYS[range]} days (${trendTotal} total)`}
        action={
          <div role="radiogroup" aria-label="Date range" className="flex gap-0.5 rounded-md bg-neutral-100 p-0.5">
            {(["7", "30", "90"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={range === r}
                onClick={() => setRange(r)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                  range === r ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {r}D
              </button>
            ))}
          </div>
        }
      >
        <InstallsLineChart data={installsByDay} />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Customers — installed vs. on record">
          {customerTotal === null || customerWithInstall === null ? (
            <EmptyChart text="Loading..." />
          ) : (
            <CustomerFunnel total={customerTotal} withInstall={customerWithInstall} />
          )}
        </ChartCard>

        <ChartCard title="Top companies by units handled">
          {companyBreakdown.length === 0 ? (
            <EmptyChart text="No ONUs recorded yet." />
          ) : (
            <LeaderboardChart data={companyBreakdown} />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Complaints by status">
        {complaints.length === 0 ? (
          <EmptyChart text="No complaints filed yet." />
        ) : (
          <ComplaintStatusChart counts={complaintBreakdown} />
        )}
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
    <div className="rounded-lg border border-neutral-200 bg-white p-3.5">
      <p className="eyebrow">{label}</p>
      <p className={`data mt-1.5 text-[26px] font-semibold leading-none ${warn ? "text-amber-600" : "text-neutral-900"}`}>
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="eyebrow">{title}</h3>
        {action}
      </div>
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
          <div key={status} className="flex items-center gap-2.5">
            <span className="w-20 shrink-0 text-xs font-medium text-neutral-700">
              {status.replace("_", " ")}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(count / max) * 100}%`,
                  backgroundColor: STATUS_HEX[status],
                  minWidth: count > 0 ? "4px" : 0,
                }}
              />
            </div>
            <span className="data w-16 shrink-0 text-right text-xs text-neutral-500">
              {count} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Horizontal bar chart ranking rows by a single magnitude — not an identity
// chart, so one hue; labels (staff name, company name) carry identity.
function LeaderboardChart({ data }: { data: { name: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2.5">
          <span className="w-24 shrink-0 truncate text-xs font-medium text-neutral-700">
            {d.name}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: CHART_HUE }}
            />
          </div>
          <span className="data w-8 shrink-0 text-right text-xs text-neutral-500">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

// Two comparative bars sharing one scale — "on record" is always the full
// width since it's the denominator; "with an install" is the same hue at
// lower opacity to read as a subset, not a separate category.
function CustomerFunnel({ total, withInstall }: { total: number; withInstall: number }) {
  const pct = total > 0 ? Math.round((withInstall / total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span>On record</span>
          <span className="data font-medium text-neutral-900">{total}</span>
        </div>
        <div className="h-5 overflow-hidden rounded-md bg-[var(--office-accent-bg)]">
          <div className="h-full rounded-md bg-[var(--office-accent)] opacity-30" style={{ width: "100%" }} />
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span>With an active install</span>
          <span className="data font-medium text-neutral-900">{withInstall}</span>
        </div>
        <div className="h-5 overflow-hidden rounded-md bg-[var(--office-accent-bg)]">
          <div
            className="h-full rounded-md bg-[var(--office-accent)]"
            style={{ width: `${Math.max(pct, withInstall > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        {total - withInstall} customer{total - withInstall === 1 ? "" : "s"} on record with no linked
        installation yet.
      </p>
    </div>
  );
}

// Stacked single bar + legend — complaint status is reserved semantic
// color (amber/blue/green), never color-alone identity.
function ComplaintStatusChart({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const labels: Record<string, string> = {
    OPEN: "Open",
    IN_PROGRESS: "In progress",
    RESOLVED: "Resolved",
  };
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-5">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: COMPLAINT_HEX[status] }}
              aria-hidden="true"
            />
            <span>{labels[status] ?? status}</span>
            <span className="data text-neutral-500">{count}</span>
          </div>
        ))}
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {Object.entries(counts).map(([status, count]) =>
          count > 0 ? (
            <div
              key={status}
              style={{ width: `${(count / total) * 100}%`, backgroundColor: COMPLAINT_HEX[status] }}
            />
          ) : null
        )}
      </div>
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
    x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2),
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
