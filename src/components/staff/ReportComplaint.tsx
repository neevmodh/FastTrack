"use client";

import { useState } from "react";
import type { Onu } from "@/lib/types";

export default function ReportComplaint({ onus }: { onus: Onu[] }) {
  const [onuId, setOnuId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onuId || !description) return;

    setSubmitting(true);
    const res = await fetch("/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onuId, description }),
    });
    setSubmitting(false);

    setMessage(res.ok ? "Complaint submitted." : "Failed to submit complaint.");
    if (res.ok) {
      setOnuId("");
      setDescription("");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md rounded-lg border border-neutral-200 bg-white p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Report an ONU not working
      </h2>
      <select
        value={onuId}
        onChange={(e) => setOnuId(e.target.value)}
        className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="">— Select your ONU —</option>
        {onus.map((o) => (
          <option key={o.id} value={o.id}>
            {o.companyName} · {o.macAddress}
          </option>
        ))}
      </select>
      <textarea
        placeholder="Describe the issue..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        rows={3}
      />
      {message && <p className="mb-3 text-sm text-neutral-600">{message}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-[var(--staff-accent)] hover:bg-[var(--staff-accent-dark)] px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit complaint"}
      </button>
    </form>
  );
}
