"use client";

import { useEffect, useRef, useState } from "react";
import type { Customer } from "@/lib/types";

export default function CustomerPicker({
  value,
  onChange,
  canCreate = true,
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  canCreate?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(async () => {
      const params = new URLSearchParams({ take: "20" });
      if (query) params.set("q", query);
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) setResults((await res.json()).items);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, open]);

  function select(customer: Customer) {
    onChange(customer);
    setQuery("");
    setOpen(false);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2">
        <p className="font-mono text-sm font-medium text-neutral-900">{value.customerId}</p>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-neutral-600 hover:underline"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        placeholder="Search by Customer ID..."
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
      />

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg">
          {!showAddForm ? (
            <>
              <div className="max-h-48 overflow-y-auto">
                {results.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => select(c)}
                    className="block w-full px-3 py-2 text-left font-mono text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                  >
                    {c.customerId}
                  </button>
                ))}
                {results.length === 0 && (
                  <p className="px-3 py-2 text-sm text-neutral-600">
                    No matches.{" "}
                    {!canCreate && "Ask Office to add this customer first."}
                  </p>
                )}
              </div>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="block w-full border-t border-neutral-100 px-3 py-2 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                >
                  + Add new customer
                </button>
              )}
            </>
          ) : (
            <InlineAddCustomer
              initialId={query}
              onCreated={(c) => select(c)}
              onCancel={() => setShowAddForm(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function InlineAddCustomer({
  initialId,
  onCreated,
  onCancel,
}: {
  initialId: string;
  onCreated: (c: Customer) => void;
  onCancel: () => void;
}) {
  const [customerId, setCustomerId] = useState(initialId);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    setSubmitting(false);

    if (!res.ok) {
      setError("Failed to add customer.");
      return;
    }
    onCreated(await res.json());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 p-3">
      <input
        required
        placeholder="Customer ID"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        autoFocus
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add & select"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
