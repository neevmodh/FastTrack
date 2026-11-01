"use client";

import { useEffect, useRef, useState } from "react";
import type { Customer } from "@/lib/types";
import { toCsv, downloadCsv } from "@/lib/csv-export";
import { extractErrorMessage } from "@/lib/api-error";

type ImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export default function CustomersPanel({
  accent,
  canManage,
}: {
  accent: "staff" | "office";
  canManage: boolean;
}) {
  const PAGE_SIZE = 50;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasInstalls, setHasInstalls] = useState<"" | "yes" | "no">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const accentVar = accent === "staff" ? "--staff-accent" : "--office-accent";

  function buildParams(extra?: Record<string, string>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (hasInstalls) params.set("hasInstalls", hasInstalls);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (extra) for (const [k, v] of Object.entries(extra)) params.set(k, v);
    return params;
  }

  async function load() {
    setLoading(true);
    const params = buildParams({ take: String(PAGE_SIZE), skip: "0" });
    const res = await fetch(`/api/customers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  async function loadMore() {
    setLoadingMore(true);
    const params = buildParams({ take: String(PAGE_SIZE), skip: String(customers.length) });
    const res = await fetch(`/api/customers?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCustomers((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    }
    setLoadingMore(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function clearFilters() {
    setHasInstalls("");
    setFrom("");
    setTo("");
    setTimeout(load, 0);
  }

  async function handleExport() {
    setExporting(true);
    // take=0 asks the API for every matching row (no page limit) — export
    // reflects the active filters, not just the page currently on screen.
    const params = buildParams({ take: "0" });
    const res = await fetch(`/api/customers?${params.toString()}`);
    setExporting(false);
    if (!res.ok) return;
    const data = await res.json();
    const csv = toCsv(
      (data.items as Customer[]).map((c) => ({
        customerId: c.customerId,
        installs: c._count?.installations ?? 0,
        createdAt: c.createdAt,
      })),
      ["customerId", "installs", "createdAt"]
    );
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete customer "${label}"? Past installation records keep a snapshot of the ID.`))
      return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportError("");
    setImportResult(null);

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/customers/import", { method: "POST", body: form });
    setImporting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setImportError(body?.error ?? "Import failed.");
      return;
    }
    setImportResult(await res.json());
    load();
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            placeholder="Search by Customer ID..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Search
          </button>
        </form>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`rounded-md border px-3 py-2 text-sm ${
            showFilters || hasInstalls || from || to
              ? "border-neutral-900 text-neutral-900"
              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          Advanced filters{hasInstalls || from || to ? " •" : ""}
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
        {canManage && (
          <>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="rounded-md px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: `var(${accentVar})` }}
            >
              {showForm ? "Cancel" : "Add customer"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import CSV / JSON"}
            </button>
          </>
        )}
      </div>

      {showFilters && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-800">
              Has installations
            </label>
            <select
              value={hasInstalls}
              onChange={(e) => setHasInstalls(e.target.value as typeof hasInstalls)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-800">
              Added from
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-800">to</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={load}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
            style={{ backgroundColor: `var(${accentVar})` }}
          >
            Apply
          </button>
          {(hasInstalls || from || to) && (
            <button
              onClick={clearFilters}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {importError && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {importError}
        </p>
      )}
      {importResult && (
        <div className="mb-3 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          <p>
            Imported {importResult.total} row(s): {importResult.created} created,{" "}
            {importResult.skipped} skipped.
          </p>
          {importResult.errors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-neutral-600">
              {importResult.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {canManage && showForm && (
        <AddCustomerForm
          accentVar={accentVar}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-neutral-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-600">
                <th className="px-3 py-2">Customer ID</th>
                <th className="px-3 py-2">Installs</th>
                {canManage && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-sm font-medium text-neutral-900">
                    {c.customerId}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">
                    {c._count?.installations ?? 0}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDelete(c.id, c.customerId)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 3 : 2}
                    className="px-3 py-6 text-center text-neutral-600"
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && customers.length > 0 && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-neutral-600">
            Showing {customers.length} of {total}
          </p>
          {customers.length < total && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddCustomerForm({
  accentVar,
  onCreated,
}: {
  accentVar: string;
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!customerId.trim()) {
      setError("Customer ID is required.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, "Failed to add customer."));
      return;
    }
    setCustomerId("");
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-3 grid max-w-md grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <input
        placeholder="Customer ID (e.g. karam, account number, code...)"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        autoFocus
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: `var(${accentVar})` }}
      >
        {submitting ? "Adding..." : "Add customer"}
      </button>
    </form>
  );
}
