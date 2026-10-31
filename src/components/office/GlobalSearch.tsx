"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Results = {
  onus: { id: string; companyName: string; macAddress: string; status: string }[];
  customers: { id: string; customerId: string }[];
  users: { id: string; name: string; email: string; role: string }[];
};

const EMPTY: Results = { onus: [], customers: [], users: [] };

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results>(EMPTY);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  function go(path: string) {
    setOpen(false);
    setQuery("");
    router.push(path);
  }

  const hasResults =
    results.onus.length > 0 || results.customers.length > 0 || results.users.length > 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-xs">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search ONUs, customers, staff..."
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 z-20 mt-1 w-80 rounded-md border border-neutral-200 bg-white shadow-lg">
          {!hasResults ? (
            <p className="px-3 py-3 text-sm text-neutral-600">No matches.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.onus.length > 0 && (
                <ResultGroup label="ONUs">
                  {results.onus.map((o) => (
                    <ResultRow
                      key={o.id}
                      onClick={() => go(`/office/onu/${o.id}`)}
                      primary={`${o.companyName} · ${o.macAddress}`}
                      secondary={o.status}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.customers.length > 0 && (
                <ResultGroup label="Customers">
                  {results.customers.map((c) => (
                    <ResultRow
                      key={c.id}
                      onClick={() => go("/office?tab=customers")}
                      primary={c.customerId}
                    />
                  ))}
                </ResultGroup>
              )}
              {results.users.length > 0 && (
                <ResultGroup label="Staff / Office">
                  {results.users.map((u) => (
                    <ResultRow
                      key={u.id}
                      onClick={() => go(`/office/users/${u.id}`)}
                      primary={u.name}
                      secondary={`${u.role} · ${u.email}`}
                    />
                  ))}
                </ResultGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-600">{label}</p>
      {children}
    </div>
  );
}

function ResultRow({
  primary,
  secondary,
  onClick,
}: {
  primary: string;
  secondary?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
    >
      <span className="font-medium text-neutral-900">{primary}</span>
      {secondary && <span className="ml-2 text-xs text-neutral-600">{secondary}</span>}
    </button>
  );
}
