"use client";

import { useState } from "react";
import Link from "next/link";
import type { AppUser, Onu } from "@/lib/types";

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

  const filtered = onus.filter((o) => {
    const needle = q.toLowerCase();
    return (
      o.companyName.toLowerCase().includes(needle) ||
      o.macAddress.toLowerCase().includes(needle) ||
      (o.serialNumber ?? "").toLowerCase().includes(needle) ||
      (o.assignedTo?.name ?? "").toLowerCase().includes(needle) ||
      (o.installation?.customerName ?? "").toLowerCase().includes(needle)
    );
  });

  async function handleDelete(id: string) {
    if (!confirm("Remove this ONU from records?")) return;
    const res = await fetch(`/api/onu/${id}`, { method: "DELETE" });
    if (res.ok) onRefresh();
  }

  async function handleAssign(id: string, staffId: string) {
    await fetch(`/api/onu/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignedToId: staffId || null,
        status: staffId ? "ASSIGNED" : "IN_STOCK",
      }),
    });
    onRefresh();
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
          onClick={onRefresh}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Refresh
        </button>
      </div>

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
                    {o.status === "INSTALLED" ? (
                      o.assignedTo ? (
                        <Link
                          href={`/office/users/${o.assignedTo.id}`}
                          className="font-medium text-[var(--office-accent-dark)] hover:underline"
                        >
                          {o.assignedTo.name}
                        </Link>
                      ) : (
                        "-"
                      )
                    ) : (
                      <select
                        value={o.assignedTo?.id ?? ""}
                        onChange={(e) => handleAssign(o.id, e.target.value)}
                        className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      >
                        <option value="">Unassigned</option>
                        {staffUsers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {o.installation?.customerName ?? "-"}
                    {o.installation?.customerAddress && (
                      <span className="block text-xs text-neutral-600">
                        {o.installation.customerAddress}
                      </span>
                    )}
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
