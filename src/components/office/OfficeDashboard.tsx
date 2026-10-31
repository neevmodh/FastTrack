"use client";

import { useEffect, useState } from "react";
import type { Onu, AppUser, Complaint, AuditLogEntry } from "@/lib/types";
import AddStockForm from "./AddStockForm";
import StockTable from "./StockTable";
import UsersPanel from "./UsersPanel";
import ComplaintsPanel from "./ComplaintsPanel";
import LogsPanel from "./LogsPanel";
import CustomersPanel from "@/components/shared/CustomersPanel";

type Tab = "stock" | "add" | "users" | "customers" | "complaints" | "logs";

export default function OfficeDashboard({ isAdmin }: { isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("stock");
  const [onus, setOnus] = useState<Onu[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadStock() {
    setLoading(true);
    const res = await fetch("/api/onu");
    if (res.ok) setOnus(await res.json());
    setLoading(false);
  }

  async function loadUsers() {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }

  async function loadComplaints() {
    const res = await fetch("/api/complaints");
    if (res.ok) setComplaints(await res.json());
  }

  async function loadLogs() {
    const res = await fetch("/api/logs");
    if (res.ok) setLogs(await res.json());
  }

  useEffect(() => {
    loadStock();
    loadUsers();
    loadComplaints();
  }, []);

  useEffect(() => {
    if (tab === "logs") loadLogs();
  }, [tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "stock", label: `Stock (${onus.length})` },
    { key: "add", label: "Add ONU" },
    { key: "users", label: "Users" },
    { key: "customers", label: "Customers" },
    { key: "complaints", label: `Complaints (${complaints.filter((c) => c.status !== "RESOLVED").length})` },
    { key: "logs", label: "Activity log" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-4">
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? "text-[var(--office-accent-dark)]"
                : "border-transparent text-neutral-600 hover:text-neutral-800"
            }`}
            style={
              tab === t.key ? { borderColor: "var(--office-accent)" } : undefined
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stock" && (
        <StockTable
          onus={onus}
          staffUsers={users.filter((u) => u.role === "STAFF")}
          loading={loading}
          onRefresh={loadStock}
        />
      )}
      {tab === "add" && (
        <AddStockForm
          onCreated={() => {
            loadStock();
            setTab("stock");
          }}
        />
      )}
      {tab === "users" && (
        <UsersPanel users={users} isAdmin={isAdmin} onRefresh={loadUsers} />
      )}
      {tab === "customers" && <CustomersPanel accent="office" />}
      {tab === "complaints" && (
        <ComplaintsPanel complaints={complaints} onRefresh={loadComplaints} />
      )}
      {tab === "logs" && <LogsPanel logs={logs} />}
    </div>
  );
}
