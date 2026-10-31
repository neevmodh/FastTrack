"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Onu, AppUser, Complaint } from "@/lib/types";
import AddStockForm from "./AddStockForm";
import StockTable from "./StockTable";
import UsersPanel from "./UsersPanel";
import ComplaintsPanel from "./ComplaintsPanel";
import AnalyticsDashboard from "./AnalyticsDashboard";
import CustomersPanel from "@/components/shared/CustomersPanel";

type Tab = "dashboard" | "stock" | "add" | "users" | "customers" | "complaints";

export default function OfficeDashboard(props: { isAdmin: boolean }) {
  return (
    <Suspense>
      <OfficeDashboardInner {...props} />
    </Suspense>
  );
}

function OfficeDashboardInner({ isAdmin }: { isAdmin: boolean }) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "dashboard";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [onus, setOnus] = useState<Onu[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
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

  useEffect(() => {
    loadStock();
    loadUsers();
    loadComplaints();
  }, []);

  const openComplaints = complaints.filter((c) => c.status !== "RESOLVED").length;

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-wrap">
      <nav
        aria-label="Primary"
        className="w-full flex-shrink-0 border-b border-neutral-200 bg-white p-3 sm:w-[196px] sm:border-b-0 sm:border-r sm:p-4"
      >
        <div className="flex gap-1 overflow-x-auto sm:flex-col sm:gap-0.5 sm:overflow-visible">
          <p className="eyebrow mb-1 hidden px-2.5 sm:block">Overview</p>
          <SideLink active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={IconGrid}>
            Dashboard
          </SideLink>
          <SideLink active={tab === "stock"} onClick={() => setTab("stock")} icon={IconBox} count={onus.length}>
            Stock
          </SideLink>
          <SideLink active={tab === "add"} onClick={() => setTab("add")} icon={IconPlusCircle}>
            Add ONU
          </SideLink>
          <p className="eyebrow mb-1 mt-3 hidden px-2.5 sm:block">People</p>
          <SideLink active={tab === "users"} onClick={() => setTab("users")} icon={IconUsers}>
            Users
          </SideLink>
          <SideLink active={tab === "customers"} onClick={() => setTab("customers")} icon={IconUserGroup}>
            Customers
          </SideLink>
          <p className="eyebrow mb-1 mt-3 hidden px-2.5 sm:block">Support</p>
          <SideLink
            active={tab === "complaints"}
            onClick={() => setTab("complaints")}
            icon={IconMessage}
            badge={openComplaints > 0 ? openComplaints : undefined}
          >
            Complaints
          </SideLink>
          <Link
            href="/office/activity"
            className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <IconClock className="h-4 w-4 flex-shrink-0" />
            Activity log
          </Link>
        </div>
      </nav>

      <main className="min-w-0 flex-1 p-4 sm:p-6">
        {tab === "dashboard" && (
          <AnalyticsDashboard onus={onus} complaints={complaints} users={users} />
        )}
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
        {tab === "customers" && <CustomersPanel accent="office" canManage />}
        {tab === "complaints" && (
          <ComplaintsPanel complaints={complaints} onRefresh={loadComplaints} />
        )}
      </main>
    </div>
  );
}

function SideLink({
  active,
  onClick,
  icon: Icon,
  count,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: (props: { className?: string }) => React.ReactElement;
  count?: number;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-[13px] font-medium ${
        active
          ? "bg-[var(--office-accent-bg)] text-[var(--office-accent-dark)]"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {children}
      {count !== undefined && (
        <span className="data ml-auto text-xs text-neutral-400">{count}</span>
      )}
      {badge !== undefined && (
        <span className="ml-auto rounded-md bg-red-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-red-600">
          {badge}
        </span>
      )}
    </button>
  );
}

function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function IconBox({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
    </svg>
  );
}
function IconPlusCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconUserGroup({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" />
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
function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
    </svg>
  );
}
