"use client";

import { useEffect, useState } from "react";
import type { Customer } from "@/lib/types";

export default function CustomersPanel({ accent }: { accent: "staff" | "office" }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const accentVar = accent === "staff" ? "--staff-accent" : "--office-accent";
  const accentDarkVar = accent === "staff" ? "--staff-accent-dark" : "--office-accent-dark";

  async function load(query?: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const res = await fetch(`/api/customers?${params.toString()}`);
    if (res.ok) setCustomers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(q);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete customer "${name}"? Past installation records keep a snapshot of their details.`))
      return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) load(q);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            placeholder="Search by name, phone, address..."
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
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md px-3 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: `var(${accentVar})` }}
        >
          {showForm ? "Cancel" : "Add customer"}
        </button>
      </div>

      {showForm && (
        <AddCustomerForm
          accentVar={accentVar}
          onCreated={() => {
            setShowForm(false);
            load(q);
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
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Installs</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2 font-medium text-neutral-900">{c.name}</td>
                  <td className="px-3 py-2 text-neutral-600">{c.phone ?? "-"}</td>
                  <td className="px-3 py-2 text-neutral-600">{c.address ?? "-"}</td>
                  <td className="px-3 py-2 text-neutral-600">
                    {c._count?.installations ?? 0}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-neutral-600">
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
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.toString?.() ?? "Failed to add customer.");
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
        required
        placeholder="Customer name"
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
