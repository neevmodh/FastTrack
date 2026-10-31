"use client";

import type { Onu } from "@/lib/types";

export default function MyOnusList({
  onus,
  loading,
}: {
  onus: Onu[];
  loading: boolean;
}) {
  if (loading) return <p className="text-sm text-neutral-600">Loading...</p>;

  return (
    <div className="space-y-2">
      {onus.map((o) => (
        <div key={o.id} className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-900">
              {o.companyName} · <span className="font-mono">{o.macAddress}</span>
            </p>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              {o.status}
            </span>
          </div>
          {o.installation?.customerIdText && (
            <p className="mt-1 text-xs text-neutral-600">
              Customer: <span className="font-mono">{o.installation.customerIdText}</span>
            </p>
          )}
          {o.installation?.installedAt && (
            <p className="mt-1 text-xs text-neutral-600">
              Installed {new Date(o.installation.installedAt).toLocaleString()}
            </p>
          )}
        </div>
      ))}
      {onus.length === 0 && (
        <p className="text-sm text-neutral-600">No ONUs assigned to you yet.</p>
      )}
    </div>
  );
}
