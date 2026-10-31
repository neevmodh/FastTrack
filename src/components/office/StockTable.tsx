"use client";

import { useState } from "react";
import type { Onu } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "bg-neutral-100 text-neutral-700",
  ASSIGNED: "bg-amber-100 text-amber-700",
  INSTALLED: "bg-green-100 text-green-700",
  FAULTY: "bg-red-100 text-red-700",
  RETURNED: "bg-blue-100 text-blue-700",
};

export default function StockTable({
  onus,
  loading,
  onRefresh,
}: {
  onus: Onu[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [q, setQ] = useState("");

  const filtered = onus.filter((o) => {
    const needle = q.toLowerCase();
    return (
      o.companyName.toLowerCase().includes(needle) ||
      o.macAddress.toLowerCase().includes(needle) ||
      (o.serialNumber ?? "").toLowerCase().includes(needle)
    );
  });

  async function handleDelete(id: string) {
    if (!confirm("Remove this ONU from records?")) return;
    const res = await fetch(`/api/onu/${id}`, { method: "DELETE" });
    if (res.ok) onRefresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input
          placeholder="Search by company, MAC, or serial..."
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
                <th className="px-3 py-2">Assigned to</th>
                <th className="px-3 py-2">Added by</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-neutral-900">
                    {o.companyName}
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
                    {o.assignedTo?.name ?? "-"}
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
                  <td colSpan={7} className="px-3 py-6 text-center text-neutral-600">
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
