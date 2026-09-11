"use client";

import { useEffect, useRef, useState } from "react";
import type { Person } from "@/types/person";
import { fullName } from "@/lib/formatName";

interface PersonSearchProps {
  onSelectPerson: (personId: string) => void;
  placeholder?: string;
}

export default function PersonSearch({
  onSelectPerson,
  placeholder,
}: PersonSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      fetch(`/api/persons?q=${encodeURIComponent(query)}&limit=20`)
        .then((res) => res.json())
        .then((json) => setResults(json.data ?? []))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Search by name or place…"}
        className="w-full rounded-card border border-ink/25 bg-parchment-light px-4 py-2.5 font-body text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-brass"
      />
      {open && query.trim() && (
        <div className="absolute z-20 mt-1.5 max-h-80 w-full overflow-y-auto rounded-card border border-ink/20 bg-parchment-light shadow-none">
          {loading && (
            <p className="px-4 py-3 text-sm text-ink-faint">Searching…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-faint">
              No one matches "{query}".
            </p>
          )}
          {!loading &&
            results.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectPerson(p.id);
                  setOpen(false);
                  // setQuery(`${p.firstName} ${p.middleName} ${p.lastName}`);
                  setQuery(fullName(p));
                }}
                className="flex w-full flex-col items-start border-b border-ink/10 px-4 py-2.5 text-left last:border-0 hover:bg-parchment-dark"
              >
                <span className="font-display text-sm font-semibold text-ink">
                  {p.firstName} &nbsp;
                  {p?.middleName} {p?.lastName}
                  {p.maidenName ? ` (née ${p.maidenName})` : ""}
                </span>
                <span className="text-xs text-ink-faint">
                  {p.birthDate?.slice(0, 4) ?? "?"}
                  {p.deathDate ? `–${p.deathDate.slice(0, 4)}` : ""}
                  {p.birthPlace ? ` · ${p.birthPlace}` : ""}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
