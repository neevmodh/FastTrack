"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { OnuDetail as OnuDetailType, AuditLogEntry, OnuStatus } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "bg-neutral-100 text-neutral-700",
  ASSIGNED: "bg-amber-100 text-amber-700",
  INSTALLED: "bg-green-100 text-green-700",
  FAULTY: "bg-red-100 text-red-700",
  RETURNED: "bg-blue-100 text-blue-700",
};

const STATUS_OPTIONS: OnuStatus[] = [
  "IN_STOCK",
  "ASSIGNED",
  "INSTALLED",
  "FAULTY",
  "RETURNED",
];

export default function OnuDetail({ onuId }: { onuId: string }) {
  const [onu, setOnu] = useState<OnuDetailType | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);

  async function load() {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    setError("");

    const [onuRes, logsRes] = await Promise.all([
      fetch(`/api/onu/${onuId}`),
      fetch(`/api/logs?entityType=Onu&entityId=${onuId}`),
    ]);

    if (myRequestId !== requestIdRef.current) return;

    if (!onuRes.ok) {
      setError(onuRes.status === 404 ? "ONU not found." : "Failed to load ONU.");
      setLoading(false);
      return;
    }

    setOnu(await onuRes.json());
    if (logsRes.ok) setLogs(await logsRes.json());
    if (myRequestId === requestIdRef.current) setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onuId]);

  async function updateStatus(status: OnuStatus) {
    await fetch(`/api/onu/${onuId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 p-4">
      <Link
        href="/office"
        className="mb-4 inline-block text-sm text-[var(--office-accent-dark)] hover:underline"
      >
        ← Back to Stock
      </Link>

      {loading && <p className="text-sm text-neutral-600">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {onu && (
        <>
          <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-4">
                {onu.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={onu.photoUrl}
                    alt="ONU label"
                    className="h-24 w-24 rounded-md border border-neutral-200 object-cover"
                  />
                )}
                <div>
                  <h1 className="text-lg font-semibold text-neutral-900">
                    {onu.companyName}
                    {onu.model && (
                      <span className="ml-2 text-sm font-normal text-neutral-600">
                        {onu.model}
                      </span>
                    )}
                  </h1>
                  <p className="font-mono text-sm text-neutral-600">{onu.macAddress}</p>
                </div>
              </div>
              <select
                value={onu.status}
                onChange={(e) => updateStatus(e.target.value as OnuStatus)}
                className={`rounded-full border-0 px-3 py-1 text-xs font-medium ${STATUS_COLORS[onu.status]}`}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Field label="Unit serial" value={onu.serialNumber} />
              <Field label="PON / GPON serial" value={onu.ponSerial} />
              <Field label="IP address" value={onu.ipAddress} />
              <Field label="Added by" value={onu.addedBy?.name} />
              <Field
                label="Added on"
                value={new Date(onu.createdAt).toLocaleDateString()}
              />
              <Field label="Currently held by" value={onu.assignedTo?.name} />
            </div>
            {onu.notes && (
              <p className="mt-3 rounded-md bg-neutral-50 p-2 text-sm text-neutral-700">
                {onu.notes}
              </p>
            )}
          </div>

          {onu.installation && (
            <Section title="Installation">
              <div className="grid grid-cols-2 gap-3 p-3 text-sm sm:grid-cols-3">
                <Field label="Installed by" value={onu.installation.staff.name} />
                <Field
                  label="Installed on"
                  value={new Date(onu.installation.installedAt).toLocaleString()}
                />
                <Field
                  label="Customer"
                  value={
                    onu.installation.customer?.name ??
                    onu.installation.customerName ??
                    undefined
                  }
                />
                <Field
                  label="Customer address"
                  value={
                    onu.installation.customer?.address ??
                    onu.installation.customerAddress ??
                    undefined
                  }
                />
                <Field
                  label="Customer phone"
                  value={onu.installation.customer?.phone ?? undefined}
                />
                {onu.installation.manualOverride && (
                  <Field label="Verification" value="Manually verified by staff" />
                )}
              </div>
              {onu.installation.notes && (
                <p className="border-t border-neutral-100 px-3 py-2 text-sm text-neutral-700">
                  {onu.installation.notes}
                </p>
              )}
            </Section>
          )}

          <Section title={`Complaints (${onu.complaints.length})`}>
            {onu.complaints.length === 0 ? (
              <EmptyRow text="No complaints filed for this ONU." />
            ) : (
              <div className="divide-y divide-neutral-100">
                {onu.complaints.map((c) => (
                  <div key={c.id} className="px-3 py-2">
                    <p className="text-sm text-neutral-900">{c.description}</p>
                    <p className="text-xs text-neutral-600">
                      {c.reportedBy.name} · {new Date(c.createdAt).toLocaleDateString()} ·{" "}
                      {c.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Timeline">
            {logs.length === 0 ? (
              <EmptyRow text="No history recorded." />
            ) : (
              <div className="divide-y divide-neutral-100">
                {logs.map((l) => (
                  <div key={l.id} className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-900">
                        {formatAction(l.action)}
                      </span>
                      <span className="text-xs text-neutral-600">
                        {new Date(l.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600">
                      {l.user ? `${l.user.name} (${l.user.role})` : "System"}
                      {l.details ? ` — ${summarizeDetails(l.details)}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function formatAction(action: string): string {
  const spaced = action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
  return spaced.replace(/\bOnu\b/g, "ONU");
}

function summarizeDetails(details: string): string {
  try {
    const parsed = JSON.parse(details);
    if (typeof parsed === "object" && parsed !== null) {
      return Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
    }
  } catch {
    // not JSON — show as-is
  }
  return details;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-lg border border-neutral-200 bg-white">
      <h2 className="border-b border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-900">
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-3 py-4 text-sm text-neutral-600">{text}</p>;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-neutral-600">{label}</p>
      <p className="font-medium text-neutral-900">{value ?? "-"}</p>
    </div>
  );
}
