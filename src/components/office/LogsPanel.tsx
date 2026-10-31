"use client";

import type { AuditLogEntry } from "@/lib/types";

export default function LogsPanel({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-b border-neutral-100 last:border-0">
              <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-500">
                {new Date(l.createdAt).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-neutral-700">
                {l.user ? `${l.user.name} (${l.user.role})` : "System"}
              </td>
              <td className="px-3 py-2 font-medium text-neutral-900">{l.action}</td>
              <td className="px-3 py-2 text-xs text-neutral-500">{l.details}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-neutral-400">
                No activity yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
