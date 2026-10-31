"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OnuDetail as OnuDetailType, AuditLogEntry, OnuStatus, Onu } from "@/lib/types";
import { extractErrorMessage } from "@/lib/api-error";

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
  const router = useRouter();
  const [onu, setOnu] = useState<OnuDetailType | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReplace, setShowReplace] = useState(false);
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
                  label="Customer ID"
                  value={
                    onu.installation.customer?.customerId ??
                    onu.installation.customerIdText ??
                    undefined
                  }
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
              {onu.installation.replaces && (
                <p className="border-t border-neutral-100 px-3 py-2 text-xs text-neutral-600">
                  Replaces{" "}
                  <Link
                    href={`/office/onu/${onu.installation.replaces.onu.id}`}
                    className="font-mono text-[var(--office-accent-dark)] hover:underline"
                  >
                    {onu.installation.replaces.onu.companyName} ·{" "}
                    {onu.installation.replaces.onu.macAddress}
                  </Link>
                </p>
              )}
              {onu.installation.replacedBy ? (
                <p className="border-t border-neutral-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Replaced by{" "}
                  <Link
                    href={`/office/onu/${onu.installation.replacedBy.onu.id}`}
                    className="font-mono underline"
                  >
                    {onu.installation.replacedBy.onu.companyName} ·{" "}
                    {onu.installation.replacedBy.onu.macAddress}
                  </Link>
                </p>
              ) : (
                onu.status === "INSTALLED" && (
                  <div className="border-t border-neutral-100 p-3">
                    {!showReplace ? (
                      <button
                        type="button"
                        onClick={() => setShowReplace(true)}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
                      >
                        Replace ONU
                      </button>
                    ) : (
                      <ReplaceOnuForm
                        onuId={onu.id}
                        onCancel={() => setShowReplace(false)}
                        onReplaced={(newOnuId) => router.push(`/office/onu/${newOnuId}`)}
                      />
                    )}
                  </div>
                )
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

function ReplaceOnuForm({
  onuId,
  onCancel,
  onReplaced,
}: {
  onuId: string;
  onCancel: () => void;
  onReplaced: (newOnuId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Onu[]>([]);
  const [selected, setSelected] = useState<Onu | null>(null);
  const [reason, setReason] = useState<"FAULTY" | "RETURNED">("FAULTY");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selected) return;
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams({ status: "IN_STOCK" });
      if (query) params.set("q", query);
      const res = await fetch(`/api/onu?${params.toString()}`);
      if (res.ok) setResults(await res.json());
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, selected]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Pick a replacement ONU from stock.");
      return;
    }
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/onu/${onuId}/replace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newOnuId: selected.id, reason, notes: notes || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(extractErrorMessage(await res.json().catch(() => null), "Failed to replace ONU."));
      return;
    }
    onReplaced(selected.id);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-800">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as "FAULTY" | "RETURNED")}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        >
          <option value="FAULTY">Faulty — being swapped out</option>
          <option value="RETURNED">Returned — no longer needed</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-800">
          Replacement ONU (from stock)
        </label>
        {selected ? (
          <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-2">
            <p className="text-sm font-medium text-neutral-900">
              {selected.companyName} · <span className="font-mono">{selected.macAddress}</span>
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-neutral-600 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <div>
            <input
              placeholder="Search in-stock ONUs by company, MAC, serial..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
            <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-neutral-200 bg-white">
              {results.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelected(o)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  <span className="font-medium text-neutral-900">{o.companyName}</span>{" "}
                  <span className="font-mono text-xs text-neutral-600">{o.macAddress}</span>
                </button>
              ))}
              {results.length === 0 && (
                <p className="px-3 py-2 text-sm text-neutral-600">
                  No in-stock ONUs match. Add one to stock first.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-800">
          Notes (optional)
        </label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. unit overheating"
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !selected}
          className="rounded-md bg-[var(--office-accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--office-accent-dark)] disabled:opacity-50"
        >
          {submitting ? "Replacing..." : "Confirm replacement"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
