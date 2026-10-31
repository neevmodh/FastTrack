"use client";

import type { Complaint } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
};

export default function ComplaintsPanel({
  complaints,
  onRefresh,
}: {
  complaints: Complaint[];
  onRefresh: () => void;
}) {
  async function setStatus(id: string, status: string) {
    await fetch(`/api/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onRefresh();
  }

  return (
    <div className="space-y-2">
      {complaints.map((c) => (
        <div
          key={c.id}
          className="rounded-lg border border-neutral-200 bg-white p-3"
        >
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}
            >
              {c.status}
            </span>
            <span className="text-xs text-neutral-600">
              {new Date(c.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-900">{c.description}</p>
          <p className="mt-1 text-xs text-neutral-600">
            {c.onu.companyName} · {c.onu.macAddress} · reported by {c.reportedBy.name}
          </p>
          <div className="mt-2 flex gap-2">
            {c.status !== "IN_PROGRESS" && (
              <button
                onClick={() => setStatus(c.id, "IN_PROGRESS")}
                className="text-xs text-amber-700 hover:underline"
              >
                Mark in progress
              </button>
            )}
            {c.status !== "RESOLVED" && (
              <button
                onClick={() => setStatus(c.id, "RESOLVED")}
                className="text-xs text-green-700 hover:underline"
              >
                Mark resolved
              </button>
            )}
          </div>
        </div>
      ))}
      {complaints.length === 0 && (
        <p className="text-sm text-neutral-600">No complaints reported.</p>
      )}
    </div>
  );
}
