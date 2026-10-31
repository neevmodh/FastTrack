"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type Portal = "staff" | "office";

const PORTAL_COPY: Record<
  Portal,
  { label: string; blurb: string; placeholder: string }
> = {
  staff: {
    label: "Staff",
    blurb: "Scan, install, and report from the field",
    placeholder: "staff@company.com",
  },
  office: {
    label: "Office",
    blurb: "Manage stock, users, and installations",
    placeholder: "office@company.com",
  },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [portal, setPortal] = useState<Portal>("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const accent = portal === "staff" ? "staff" : "office";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(params.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            FastTrack
          </h1>
          <p className="mt-1 text-base text-neutral-600">
            ONU stock &amp; installation manager
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          {(["staff", "office"] as Portal[]).map((p) => {
            const active = portal === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPortal(p)}
                className={`rounded-xl border-2 px-4 py-4 text-left transition-colors ${
                  active
                    ? p === "staff"
                      ? "border-[var(--staff-accent)] bg-[var(--staff-accent-bg)]"
                      : "border-[var(--office-accent)] bg-[var(--office-accent-bg)]"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                <p
                  className={`text-base font-semibold ${
                    active
                      ? p === "staff"
                        ? "text-[var(--staff-accent-dark)]"
                        : "text-[var(--office-accent-dark)]"
                      : "text-neutral-900"
                  }`}
                >
                  {PORTAL_COPY[p].label}
                </p>
                <p className="mt-0.5 text-xs text-neutral-600">
                  {PORTAL_COPY[p].blurb}
                </p>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <label className="mb-1 block text-sm font-medium text-neutral-800">
            Email
          </label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder={PORTAL_COPY[portal].placeholder}
          />

          <label className="mb-1 block text-sm font-medium text-neutral-800">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2.5 text-base text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            placeholder="••••••••"
          />

          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-md px-3 py-2.5 text-base font-semibold text-white transition-colors disabled:opacity-50 ${
              accent === "staff"
                ? "bg-[var(--staff-accent)] hover:bg-[var(--staff-accent-dark)]"
                : "bg-[var(--office-accent)] hover:bg-[var(--office-accent-dark)]"
            }`}
          >
            {loading ? "Signing in..." : `Sign in to ${PORTAL_COPY[portal].label}`}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-600">
          Your account's role decides which portal you land in.
        </p>
      </div>
    </div>
  );
}
