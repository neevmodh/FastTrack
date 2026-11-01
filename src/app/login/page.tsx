"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

type Portal = "staff" | "office";

const PORTAL_COPY: Record<
  Portal,
  { label: string; blurb: string; placeholder: string }
> = {
  staff: {
    label: "Staff",
    blurb: "Scan & install",
    placeholder: "staff@company.com",
  },
  office: {
    label: "Office",
    blurb: "Manage & oversee",
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
  const { data: session, status } = useSession();

  // The PWA's manifest start_url points straight at /login (a redirecting
  // start_url breaks Android's install/WebAPK generation — see commit
  // history). So an already-signed-in user reopening the installed app
  // lands here first; send them straight to their portal instead of
  // showing the form again.
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl) {
      router.replace(callbackUrl);
      return;
    }
    router.replace(session.user.role === "STAFF" ? "/staff" : "/office");
  }, [status, session, params, router]);

  const [portal, setPortal] = useState<Portal>("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isStaff = portal === "staff";
  const accent = isStaff ? "var(--staff-accent)" : "var(--office-accent)";
  const accentDark = isStaff ? "var(--staff-accent-dark)" : "var(--office-accent-dark)";

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
    <div className="flex min-h-screen w-full flex-wrap">
      {/* Brand panel */}
      <div className="relative flex min-w-[340px] flex-1 flex-col justify-between overflow-hidden p-10 text-[#FAFAF9] sm:p-14" style={{ background: "#16132E" }}>
        <div className="relative z-10 flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="11" height="11" rx="2.5" stroke={accent} strokeWidth="2" />
            <rect x="18" y="1" width="11" height="11" rx="2.5" stroke="#FAFAF9" strokeOpacity="0.35" strokeWidth="2" />
            <rect x="9.5" y="18" width="11" height="11" rx="2.5" stroke={accent} strokeWidth="2" />
            <line x1="12" y1="6.5" x2="18" y2="6.5" stroke="#FAFAF9" strokeOpacity="0.35" strokeWidth="2" />
            <line x1="6.5" y1="12" x2="6.5" y2="23.5" stroke="#FAFAF9" strokeOpacity="0.35" strokeWidth="2" />
          </svg>
          <span className="text-lg font-bold tracking-tight">FastTrack</span>
        </div>

        <div className="relative z-10 max-w-md py-10">
          <p className="mb-4 font-mono text-xs uppercase tracking-wider" style={{ color: accent }}>
            ONU stock &amp; installation manager
          </p>
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Every unit tracked, every install verified.
          </h1>
          <p className="text-[15px] leading-relaxed text-[#FAFAF9]/65">
            From the moment a box lands in stock to the day it&apos;s live at a customer&apos;s door — one system for staff, office, and admin.
          </p>
        </div>

        <div className="relative z-10 hidden gap-7 sm:flex">
          <div>
            <p className="font-mono text-xl font-medium" style={{ color: accent }}>OCR</p>
            <p className="mt-1 text-xs text-[#FAFAF9]/50">Scan a label to log an ONU</p>
          </div>
          <div className="w-px bg-[#FAFAF9]/15" />
          <div>
            <p className="font-mono text-xl font-medium" style={{ color: accent }}>3 roles</p>
            <p className="mt-1 text-xs text-[#FAFAF9]/50">Staff, Office, and Admin</p>
          </div>
        </div>

        <svg width="100%" height="220" viewBox="0 0 460 220" fill="none" className="pointer-events-none absolute bottom-[-40px] left-0 opacity-50" aria-hidden="true">
          <path d="M-20 160 C 80 160, 100 60, 200 60 S 340 180, 480 100" stroke={accent} strokeWidth="1.5" strokeOpacity="0.5" />
          <path d="M-20 200 C 100 200, 140 120, 240 120 S 360 40, 480 60" stroke="#FAFAF9" strokeOpacity="0.12" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Form panel */}
      <div className="flex min-w-[340px] flex-1 items-center justify-center bg-[var(--background)] p-8 sm:p-12">
        <div className="w-full max-w-sm">
          <h2 className="mb-1.5 text-xl font-bold text-neutral-900">Sign in</h2>
          <p className="mb-6 text-sm text-neutral-600">
            Choose your portal, then sign in with your account.
          </p>

          <div role="radiogroup" aria-label="Portal" className="mb-6 flex gap-2 rounded-xl bg-neutral-100 p-1">
            {(["staff", "office"] as Portal[]).map((p) => {
              const active = portal === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPortal(p)}
                  className={`flex-1 rounded-lg px-3.5 py-2.5 text-left transition-colors ${
                    active ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  style={active ? { color: accentDark } : undefined}
                >
                  <span className="block text-[13px] font-semibold">{PORTAL_COPY[p].label}</span>
                  <span className="block text-[11px] opacity-75">{PORTAL_COPY[p].blurb}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-neutral-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={PORTAL_COPY[portal].placeholder}
                className="w-full rounded-lg border-[1.5px] border-neutral-200 px-3.5 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-neutral-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border-[1.5px] border-neutral-200 px-3.5 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg px-3 py-3.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {loading ? "Signing in..." : `Sign in to ${PORTAL_COPY[portal].label}`}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-neutral-400">
            Your account&apos;s role decides which portal you land in.
          </p>
        </div>
      </div>
    </div>
  );
}
