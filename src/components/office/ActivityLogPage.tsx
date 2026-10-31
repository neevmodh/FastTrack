"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AppUser, AuditLogEntry } from "@/lib/types";

const ACTIONS = [
  "ONU_STOCK_ADDED",
  "ONU_UPDATED",
  "ONU_INSTALLED",
  "ONU_REPLACED",
  "ONU_DELETED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "CUSTOMER_DELETED",
  "CUSTOMERS_IMPORTED",
  "COMPLAINT_CREATED",
  "COMPLAINT_UPDATED",
];
const ENTITY_TYPES = ["Onu", "User", "Customer", "Complaint"];
const DELETE_ACTIONS = new Set(["ONU_DELETED", "USER_DELETED", "CUSTOMER_DELETED"]);

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [deletionsOnly, setDeletionsOnly] = useState(false);
  const requestIdRef = useRef(0);

  async function load() {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    if (userId) params.set("userId", userId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`/api/logs?${params.toString()}`);
    if (myRequestId !== requestIdRef.current) return;
    if (res.ok) setLogs(await res.json());
    if (myRequestId === requestIdRef.current) setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/users").then((r) => r.ok && r.json()).then((d) => d && setUsers(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function clearFilters() {
    setAction("");
    setEntityType("");
    setUserId("");
    setFrom("");
    setTo("");
    setDeletionsOnly(false);
    setTimeout(load, 0);
  }

  const visible = deletionsOnly ? logs.filter((l) => DELETE_ACTIONS.has(l.action)) : logs;
  const deletionCount = logs.filter((l) => DELETE_ACTIONS.has(l.action)).length;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-4">
      <Link
        href="/office"
        className="mb-4 inline-block text-sm text-[var(--office-accent-dark)] hover:underline"
      >
        ← Back to Dashboard
      </Link>

      <form
        onSubmit={applyFilters}
        className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-800">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">Any</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-800">Entity</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">Any</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-800">
            Performed by
          </label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="">Any</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-800">From</label>
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
          type="submit"
          className="rounded-md bg-[var(--office-accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--office-accent-dark)]"
        >
          Filter
        </button>
        {(action || entityType || userId || from || to) && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
          >
            Clear
          </button>
        )}
        <label className="ml-auto flex items-center gap-1.5 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={deletionsOnly}
            onChange={(e) => setDeletionsOnly(e.target.checked)}
          />
          Deletions only ({deletionCount})
        </label>
      </form>

      {loading ? (
        <p className="text-sm text-neutral-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-600">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => (
                <tr key={l.id} className="border-b border-neutral-100 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-neutral-600">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-neutral-700">
                    {l.user ? `${l.user.name} (${l.user.role})` : "System"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`font-medium ${
                        DELETE_ACTIONS.has(l.action) ? "text-red-700" : "text-neutral-900"
                      }`}
                    >
                      {l.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{l.details}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-neutral-600">
                    No activity matches these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-neutral-600">
        Showing up to the 500 most recent matching entries.
      </p>
    </div>
  );
}
