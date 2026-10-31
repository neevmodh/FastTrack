"use client";

import { signOut } from "next-auth/react";

export default function NavBar({
  title,
  userName,
}: {
  title: string;
  userName?: string | null;
}) {
  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        {userName && <p className="text-xs text-neutral-500">{userName}</p>}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        Sign out
      </button>
    </header>
  );
}
