"use client";

import { useEffect, useState } from "react";
import type { Onu } from "@/lib/types";
import ScanAndInstall from "./ScanAndInstall";
import MyOnusList from "./MyOnusList";
import ReportComplaint from "./ReportComplaint";
import CustomersPanel from "@/components/shared/CustomersPanel";

type Tab = "scan" | "mine" | "customers" | "report";

export default function StaffDashboard({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [tab, setTab] = useState<Tab>("scan");
  const [onus, setOnus] = useState<Onu[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadOnus() {
    setLoading(true);
    const res = await fetch("/api/onu");
    if (res.ok) setOnus(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadOnus();
  }, []);

  const availableStock = onus.filter((o) => o.status === "IN_STOCK");
  const myOnus = onus.filter((o) => o.assignedTo?.id === currentUserId);

  const tabs: { key: Tab; label: string; shortLabel: string; icon: (p: { className?: string }) => React.ReactElement }[] = [
    { key: "scan", label: `Available stock (${availableStock.length})`, shortLabel: "Scan", icon: IconScan },
    { key: "mine", label: `My ONUs (${myOnus.length})`, shortLabel: "My ONUs", icon: IconBox },
    { key: "customers", label: "Customers", shortLabel: "Customers", icon: IconUsers },
    { key: "report", label: "Report issue", shortLabel: "Report", icon: IconMessage },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4 pb-24 sm:pb-4">
      {/* Desktop/tablet: horizontal tabs */}
      <div className="mb-4 hidden gap-1 overflow-x-auto border-b border-neutral-200 sm:flex">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "text-[var(--staff-accent-dark)]"
                : "border-transparent text-neutral-600 hover:text-neutral-800"
            }`}
            style={
              tab === t.key ? { borderColor: "var(--staff-accent)" } : undefined
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mobile: current section heading (the bottom tab bar carries navigation) */}
      <h1 className="mb-4 text-lg font-semibold text-neutral-900 sm:hidden">
        {tabs.find((t) => t.key === tab)?.label}
      </h1>

      {tab === "scan" && (
        <ScanAndInstall
          availableStock={availableStock}
          loading={loading}
          onRefresh={loadOnus}
        />
      )}
      {tab === "mine" && <MyOnusList onus={myOnus} loading={loading} />}
      {tab === "customers" && <CustomersPanel accent="staff" canManage={false} />}
      {tab === "report" && <ReportComplaint onus={myOnus} />}

      {/* Mobile: fixed bottom tab bar */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 bg-white sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-1 px-2 py-2.5"
              style={{ color: active ? "var(--staff-accent-dark)" : "#A3A3A3" }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10.5px] font-semibold">{t.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function IconScan({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </svg>
  );
}
function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  );
}
function IconMessage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
