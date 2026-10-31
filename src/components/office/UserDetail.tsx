"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { UserDetail as UserDetailType } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: "bg-neutral-100 text-neutral-700",
  ASSIGNED: "bg-amber-100 text-amber-700",
  INSTALLED: "bg-green-100 text-green-700",
  FAULTY: "bg-red-100 text-red-700",
  RETURNED: "bg-blue-100 text-blue-700",
};

export default function UserDetail({ userId }: { userId: string }) {
  const [data, setData] = useState<UserDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Monotonic request id: ignore any response that isn't from the most
  // recent call to load(), no matter why an older one is still in flight
  // (double-mount in dev, rapid clicks, slow network, etc). This is the
  // only thing that reliably fixed a stale-data bug seen in testing where
  // an older unfiltered response landed after a newer filtered one.
  const requestIdRef = useRef(0);

  async function load() {
    const myRequestId = ++requestIdRef.current;

    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/users/${userId}?${params.toString()}`);
      if (myRequestId !== requestIdRef.current) return;

      if (!res.ok) {
        setError(res.status === 404 ? "User not found." : "Failed to load user.");
        return;
      }
      const json = await res.json();
      if (myRequestId !== requestIdRef.current) return;
      setData(json);
    } catch {
      if (myRequestId !== requestIdRef.current) return;
      setError("Failed to load user.");
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function clearFilter() {
    setFrom("");
    setTo("");
    setTimeout(load, 0);
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 p-4">
      <Link
        href="/office"
        className="mb-4 inline-block text-sm text-[var(--office-accent-dark)] hover:underline"
      >
        ← Back to Users
      </Link>

      {loading && <p className="text-sm text-neutral-600">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold text-neutral-900">
                  {data.user.name}
                </h1>
                <p className="text-sm text-neutral-600">{data.user.email}</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full bg-[var(--office-accent-bg)] px-3 py-1 text-xs font-semibold text-[var(--office-accent-dark)]">
                  {data.user.role}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    data.user.active
                      ? "bg-green-100 text-green-700"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {data.user.active ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-neutral-600 sm:grid-cols-4">
              <div>
                <p className="text-xs text-neutral-600">Installs</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {data.installations.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Currently holding</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {data.currentlyAssigned.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Complaints filed</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {data.complaints.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-600">Added to stock</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {data.addedOnusCount}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={applyFilter}
            className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-800">
                Installed from
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-800">
                to
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-[var(--office-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--office-accent-dark)]"
            >
              Filter
            </button>
            {(from || to) && (
              <button
                type="button"
                onClick={clearFilter}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Clear
              </button>
            )}
          </form>

          <Section title={`Installations (${data.installations.length})`}>
            {data.installations.length === 0 ? (
              <EmptyRow text="No installations in this range." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-neutral-600">
                      <th className="px-3 py-2">ONU</th>
                      <th className="px-3 py-2">MAC</th>
                      <th className="px-3 py-2">Customer ID</th>
                      <th className="px-3 py-2">Installed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.installations.map((i) => (
                      <tr key={i.id} className="border-b border-neutral-100 last:border-0">
                        <td className="px-3 py-2 font-medium text-neutral-900">
                          {i.onu.companyName}
                          {i.onu.model && (
                            <span className="block text-xs text-neutral-600">
                              {i.onu.model}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                          {i.onu.macAddress}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                          {i.customerIdText ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-neutral-600">
                          {new Date(i.installedAt).toLocaleString()}
                          {i.manualOverride && (
                            <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700">
                              manual
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title={`Currently holding (${data.currentlyAssigned.length})`}>
            {data.currentlyAssigned.length === 0 ? (
              <EmptyRow text="Nothing assigned right now." />
            ) : (
              <div className="divide-y divide-neutral-100">
                {data.currentlyAssigned.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {o.companyName} · {o.macAddress}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}
                    >
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Complaints filed (${data.complaints.length})`}>
            {data.complaints.length === 0 ? (
              <EmptyRow text="No complaints filed by this user." />
            ) : (
              <div className="divide-y divide-neutral-100">
                {data.complaints.map((c) => (
                  <div key={c.id} className="px-3 py-2">
                    <p className="text-sm text-neutral-900">{c.description}</p>
                    <p className="text-xs text-neutral-600">
                      {c.onu.companyName} · {c.onu.macAddress} ·{" "}
                      {new Date(c.createdAt).toLocaleDateString()} · {c.status}
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
