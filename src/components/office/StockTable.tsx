"use client";

import { useState } from "react";
import Link from "next/link";
import type { AppUser, Onu } from "@/lib/types";
import { toCsv, downloadCsv } from "@/lib/csv-export";

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "bg-neutral-100 text-neutral-700",
  ASSIGNED: "bg-amber-100 text-amber-700",
  INSTALLED: "bg-green-100 text-green-700",
  FAULTY: "bg-red-100 text-red-700",
  RETURNED: "bg-blue-100 text-blue-700",
};

export default function StockTable({
  onus,
  staffUsers,
  loading,
  onRefresh,
}: {
  onus: Onu[];
  staffUsers: AppUser[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [staffFilter, setStaffFilter] = useState("");
  const [installedFrom, setInstalledFrom] = useState("");
  const [installedTo, setInstalledTo] = useState("");

  const companies = Array.from(new Set(onus.map((o) => o.companyName))).sort();
  const [companyFilter, setCompanyFilter] = useState("");

  const activeFilterCount =
    statusFilter.size +
    (staffFilter ? 1 : 0) +
    (companyFilter ? 1 : 0) +
    (installedFrom ? 1 : 0) +
    (installedTo ? 1 : 0);

  function toggleStatus(status: string) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function clearFilters() {
    setStatusFilter(new Set());
    setStaffFilter("");
    setCompanyFilter("");
    setInstalledFrom("");
    setInstalledTo("");
  }

  const filtered = onus.filter((o) => {
    const needle = q.toLowerCase();
    const matchesSearch =
      o.companyName.toLowerCase().includes(needle) ||
      o.macAddress.toLowerCase().includes(needle) ||
      (o.serialNumber ?? "").toLowerCase().includes(needle) ||
      (o.assignedTo?.name ?? "").toLowerCase().includes(needle) ||
      (o.installation?.customerIdText ?? "").toLowerCase().includes(needle);
    if (!matchesSearch) return false;

    if (statusFilter.size > 0 && !statusFilter.has(o.status)) return false;
    if (companyFilter && o.companyName !== companyFilter) return false;
    if (staffFilter && o.assignedTo?.id !== staffFilter) return false;
    if (installedFrom || installedTo) {
      if (!o.installation?.installedAt) return false;
      const d = new Date(o.installation.installedAt);
      if (installedFrom && d < new Date(installedFrom)) return false;
      if (installedTo && d > new Date(new Date(installedTo).getTime() + 86400000))
        return false;
    }
    return true;
  });

  async function handleDelete(id: string) {
    if (!confirm("Remove this ONU from records?")) return;
    const res = await fetch(`/api/onu/${id}`, { method: "DELETE" });
    if (res.ok) onRefresh();
  }

  function handleExport() {
    const csv = toCsv(
      filtered.map((o) => ({
        company: o.companyName,
        model: o.model ?? "",
        mac: o.macAddress,
        serial: o.serialNumber ?? "",
        ponSerial: o.ponSerial ?? "",
        status: o.status,
        staff: o.assignedTo?.name ?? "",
        customer: o.installation?.customerIdText ?? "",
        installedAt: o.installation?.installedAt ?? "",
        addedBy: o.addedBy?.name ?? "",
        addedAt: o.createdAt,
      })),
      [
        "company",
        "model",
        "mac",
        "serial",
        "ponSerial",
        "status",
        "staff",
        "customer",
        "installedAt",
        "addedBy",
        "addedAt",
      ]
    );
    downloadCsv(`onu-stock-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input
          placeholder="Search by company, MAC, serial, staff, or customer..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`rounded-md border px-3 py-2 text-sm ${
            showFilters || activeFilterCount > 0
              ? "border-neutral-900 text-neutral-900"
              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          Advanced filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
        <button
          onClick={onRefresh}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Refresh
        </button>
        <button
          onClick={handleExport}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Export CSV
        </button>
      </div>

      {showFilters && (
        <div className="mb-3 flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-white p-3">
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-800">Status</p>
            <div className="flex flex-wrap gap-1">
              {Object.keys(STATUS_COLORS).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    statusFilter.has(s)
                      ? STATUS_COLORS[s] + " ring-1 ring-neutral-900"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-800">
              Company
            </label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-800">
              Staff
            </label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-800">
              Installed from
            </label>
            <input
              type="date"
              value={installedFrom}
              onChange={(e) => setInstalledFrom(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-800">to</label>
            <input
              type="date"
              value={installedTo}
              onChange={(e) => setInstalledTo(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-600">
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">MAC</th>
                <th className="px-3 py-2">Serial</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Installed</th>
                <th className="px-3 py-2">Added by</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-neutral-900">
                    <Link
                      href={`/office/onu/${o.id}`}
                      className="text-[var(--office-accent-dark)] hover:underline"
                    >
                      {o.companyName}
                    </Link>
                    {o.model && (
                      <span className="block text-xs text-neutral-600">{o.model}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                    {o.macAddress}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {o.serialNumber ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {o.assignedTo ? (
                      <Link
                        href={`/office/users/${o.assignedTo.id}`}
                        className="font-medium text-[var(--office-accent-dark)] hover:underline"
                      >
                        {o.assignedTo.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                    {o.installation?.customerIdText ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {o.installation?.installedAt
                      ? new Date(o.installation.installedAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {o.addedBy?.name ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-neutral-600">
                    No ONUs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
