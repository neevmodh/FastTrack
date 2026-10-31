"use client";

import { useState } from "react";
import type { AppUser, Role } from "@/lib/types";

export default function UsersPanel({
  users,
  isAdmin,
  onRefresh,
}: {
  users: AppUser[];
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      {isAdmin && (
        <div className="mb-3">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-md bg-[var(--office-accent)] hover:bg-[var(--office-accent-dark)] px-3 py-2 text-sm font-medium text-white"
          >
            {showForm ? "Cancel" : "Add user"}
          </button>
        </div>
      )}

      {showForm && (
        <CreateUserForm
          onCreated={() => {
            setShowForm(false);
            onRefresh();
          }}
        />
      )}

      <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-600">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Assigned IP</th>
              <th className="px-3 py-2">Active</th>
              {isAdmin && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow key={u.id} user={u} isAdmin={isAdmin} onRefresh={onRefresh} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({
  user,
  isAdmin,
  onRefresh,
}: {
  user: AppUser;
  isAdmin: boolean;
  onRefresh: () => void;
}) {
  const [role, setRole] = useState<Role>(user.role);
  const [ip, setIp] = useState(user.assignedIp ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, assignedIp: ip || null }),
    });
    setSaving(false);
    onRefresh();
  }

  async function toggleActive() {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    onRefresh();
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="px-3 py-2 font-medium text-neutral-900">{user.name}</td>
      <td className="px-3 py-2 text-neutral-600">{user.email}</td>
      <td className="px-3 py-2">
        {isAdmin ? (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded border border-neutral-300 px-2 py-1 text-xs"
          >
            <option value="STAFF">STAFF</option>
            <option value="OFFICE">OFFICE</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        ) : (
          user.role
        )}
      </td>
      <td className="px-3 py-2">
        {isAdmin ? (
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.x"
            className="w-28 rounded border border-neutral-300 px-2 py-1 text-xs"
          />
        ) : (
          user.assignedIp ?? "-"
        )}
      </td>
      <td className="px-3 py-2">
        {isAdmin ? (
          <button
            onClick={toggleActive}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user.active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {user.active ? "Active" : "Disabled"}
          </button>
        ) : user.active ? (
          "Yes"
        ) : (
          "No"
        )}
      </td>
      {isAdmin && (
        <td className="px-3 py-2 text-right">
          <button
            onClick={save}
            disabled={saving}
            className="text-xs text-neutral-700 hover:underline disabled:opacity-50"
          >
            Save
          </button>
        </td>
      )}
    </tr>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "STAFF" as Role,
    assignedIp: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.toString?.() ?? "Failed to create user.");
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
        placeholder="Full name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        required
        type="password"
        placeholder="Temporary password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <select
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="STAFF">Staff</option>
        <option value="OFFICE">Office</option>
        <option value="ADMIN">Admin</option>
      </select>
      <input
        placeholder="Assigned IP (optional)"
        value={form.assignedIp}
        onChange={(e) => setForm({ ...form, assignedIp: e.target.value })}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-[var(--office-accent)] hover:bg-[var(--office-accent-dark)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}
