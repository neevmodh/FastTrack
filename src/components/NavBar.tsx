"use client";

import { signOut } from "next-auth/react";

type Portal = "staff" | "office";

export default function NavBar({
  portal,
  title,
  userName,
}: {
  portal: Portal;
  title: string;
  userName?: string | null;
}) {
  const accent =
    portal === "staff" ? "var(--staff-accent)" : "var(--office-accent)";
  const accentBg =
    portal === "staff" ? "var(--staff-accent-bg)" : "var(--office-accent-bg)";

  return (
    <header
      className="flex items-center justify-between border-b-2 bg-white px-4 py-3"
      style={{ borderColor: accent }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: accentBg, color: accent }}
        >
          {portal === "staff" ? "S" : "O"}
        </span>
        <div>
          <p className="text-base font-semibold text-neutral-900">{title}</p>
          {userName && <p className="text-xs text-neutral-600">{userName}</p>}
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Sign out
      </button>
    </header>
  );
}
