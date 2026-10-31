"use client";

import { useMemo, useState } from "react";
import type { Customer, Onu } from "@/lib/types";
import OcrCapture, { OcrCaptureValue } from "@/components/OcrCapture";
import CustomerPicker from "@/components/shared/CustomerPicker";
import { extractErrorMessage } from "@/lib/api-error";

export default function ScanAndInstall({
  availableStock,
  loading,
  onRefresh,
}: {
  availableStock: Onu[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [scanned, setScanned] = useState<OcrCaptureValue | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const matchedByMac = useMemo(() => {
    if (!scanned?.macAddress) return undefined;
    return availableStock.find(
      (o) => o.macAddress.toUpperCase() === scanned.macAddress.toUpperCase()
    );
  }, [scanned, availableStock]);

  const selected = availableStock.find((o) => o.id === selectedId);
  const crossVerifyMismatch =
    matchedByMac && selectedId && matchedByMac.id !== selectedId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const onuId = selectedId || matchedByMac?.id;
    if (!onuId) {
      setError("Scan a label or select an ONU from stock first.");
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/onu/${onuId}/install`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customer?.id || undefined,
        photoUrl: scanned?.photoUrl,
        manualOverride,
        notes: notes || undefined,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, "Failed to record installation."));
      return;
    }

    setSuccess("Installation recorded.");
    setScanned(null);
    setSelectedId("");
    setCustomer(null);
    setNotes("");
    setManualOverride(false);
    onRefresh();
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <StepHeading n={1}>Scan the ONU label</StepHeading>
        <OcrCapture onChange={setScanned} />

        {scanned?.macAddress && (
          <p className="mt-3 text-sm">
            {matchedByMac ? (
              <span className="text-green-700">
                Matched stock item: {matchedByMac.companyName} (
                <span className="data">{matchedByMac.macAddress}</span>)
              </span>
            ) : (
              <span className="text-amber-700">
                No stock match for this MAC — select manually below, or ask Office
                to add this ONU first.
              </span>
            )}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <StepHeading n={2}>Select ONU from stock (cross-verify)</StepHeading>
        {loading ? (
          <p className="text-sm text-neutral-600">Loading stock...</p>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">— Select ONU —</option>
            {availableStock.map((o) => (
              <option key={o.id} value={o.id}>
                {o.companyName} · {o.macAddress}
                {o.serialNumber ? ` · ${o.serialNumber}` : ""}
              </option>
            ))}
          </select>
        )}
        {crossVerifyMismatch && (
          <p className="mt-2 text-sm text-red-600">
            Scanned MAC does not match the selected ONU. Double-check before
            submitting.
          </p>
        )}
        {selected && (
          <label className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={manualOverride}
              onChange={(e) => setManualOverride(e.target.checked)}
            />
            Manually verified / corrected (OCR was wrong or unavailable)
          </label>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <StepHeading n={3}>Assign customer</StepHeading>
          <div className="space-y-3">
            <div>
              <span className="eyebrow mb-1.5 block">Customer (optional)</span>
              <CustomerPicker value={customer} onChange={setCustomer} canCreate={false} />
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">{success}</p>}

        <div className="sticky bottom-0 -mx-4 mt-4 border-t border-neutral-200 bg-[var(--background)]/95 px-4 py-3 backdrop-blur-sm">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--staff-accent)] hover:bg-[var(--staff-accent-dark)] px-4 py-3.5 text-base font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Confirm installation"}
          </button>
        </div>
      </form>
    </div>
  );
}

function StepHeading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2.5 text-sm font-semibold text-neutral-900">
      <span className="data flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">
        {n}
      </span>
      {children}
    </h2>
  );
}
