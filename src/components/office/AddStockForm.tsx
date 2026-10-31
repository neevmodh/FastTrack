"use client";

import { useState } from "react";
import OcrCapture, { OcrCaptureValue } from "@/components/OcrCapture";

export default function AddStockForm({ onCreated }: { onCreated: () => void }) {
  const [value, setValue] = useState<OcrCaptureValue>({
    companyName: "",
    macAddress: "",
    serialNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!value.companyName || !value.macAddress) {
      setError("Company name and MAC address are required.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/onu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: value.companyName,
        macAddress: value.macAddress,
        serialNumber: value.serialNumber || undefined,
        photoUrl: value.photoUrl,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.toString?.() ?? "Failed to add ONU.");
      return;
    }

    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Add new ONU to stock
      </h2>
      <OcrCapture onChange={setValue} />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add to stock"}
      </button>
    </form>
  );
}
