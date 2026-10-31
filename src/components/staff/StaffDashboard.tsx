"use client";

import { useEffect, useState } from "react";
import type { Onu } from "@/lib/types";
import ScanAndInstall from "./ScanAndInstall";
import MyOnusList from "./MyOnusList";
import ReportComplaint from "./ReportComplaint";

type Tab = "scan" | "mine" | "report";

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

  const tabs: { key: Tab; label: string }[] = [
    { key: "scan", label: `Available stock (${availableStock.length})` },
    { key: "mine", label: `My ONUs (${myOnus.length})` },
    { key: "report", label: "Report issue" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 p-4">
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "scan" && (
        <ScanAndInstall
          availableStock={availableStock}
          loading={loading}
          onRefresh={loadOnus}
        />
      )}
      {tab === "mine" && <MyOnusList onus={myOnus} loading={loading} />}
      {tab === "report" && <ReportComplaint onus={myOnus} />}
    </div>
  );
}
