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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasInstalls, setHasInstalls] = useState<"" | "yes" | "no">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const accentVar = accent === "staff" ? "--staff-accent" : "--office-accent";

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const res = await fetch(`/api/customers?${params.toString()}`);
    if (res.ok) setCustomers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  const filtered = customers.filter((c) => {
    if (hasInstalls === "yes" && !(c._count?.installations ?? 0 > 0)) return false;
    if (hasInstalls === "no" && (c._count?.installations ?? 0) > 0) return false;
    if (from && new Date(c.createdAt) < new Date(from)) return false;
    if (to && new Date(c.createdAt) > new Date(new Date(to).getTime() + 86400000))
      return false;
    return true;
  });

  function clearFilters() {
    setHasInstalls("");
    setFrom("");
    setTo("");
  }

  function handleExport() {
    const csv = toCsv(
      filtered.map((c) => ({
        customerId: c.customerId ?? "",
        name: c.name ?? "",
        phone: c.phone ?? "",
        address: c.address ?? "",
        email: c.email ?? "",
        installs: c._count?.installations ?? 0,
        createdAt: c.createdAt,
      })),
      ["customerId", "name", "phone", "address", "email", "installs", "createdAt"]
    );
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Delete customer "${label}"? Past installation records keep a snapshot of their details.`))
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
            placeholder="Search by Customer ID, name, phone..."
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
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Export CSV
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
            {importResult.updated} updated, {importResult.skipped} skipped.
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
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Installs</th>
                {canManage && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-neutral-700">
                    {c.customerId ?? "-"}
                  </td>
                  <td className="px-3 py-2 font-medium text-neutral-900">
                    {c.name ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-neutral-600">{c.phone ?? "-"}</td>
                  <td className="px-3 py-2 text-neutral-600">{c.address ?? "-"}</td>
                  <td className="px-3 py-2 text-neutral-600">
                    {c._count?.installations ?? 0}
                  </td>
                  {canManage && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() =>
                          handleDelete(c.id, c.name ?? c.customerId ?? c.id)
                        }
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 6 : 5}
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
  const [form, setForm] = useState({
    customerId: "",
    name: "",
    phone: "",
    address: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.customerId.trim() && !form.name.trim()) {
      setError("Provide at least a Customer ID or a name.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, "Failed to add customer."));
      return;
    }
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-3 grid max-w-md grid-cols-1 gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <input
        placeholder="Customer ID (account number, code, etc. — optional)"
        value={form.customerId}
        onChange={(e) => setForm({ ...form, customerId: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Customer name (optional)"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Address (optional)"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Email (optional)"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
