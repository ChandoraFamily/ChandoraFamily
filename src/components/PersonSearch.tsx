"use client";

import { useEffect, useRef, useState } from "react";
import type { Person } from "@/types/person";
import { fullName } from "@/lib/formatName";
import { useLanguage } from "@/lib/language-context";

interface PersonSearchProps {
  onSelectPerson: (personId: string) => void;
  placeholder?: string;
}

export default function PersonSearch({
  onSelectPerson,
  placeholder,
}: PersonSearchProps) {
  const { lang, t } = useLanguage();
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

  const defaultPlaceholder =
    lang === "hi"
      ? "नाम या स्थान द्वारा खोजें…"
      : "Search by name or place…";

  return (
    <div ref={boxRef} className="themed-person-search relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? defaultPlaceholder}
        className="w-full rounded-card px-4 py-2.5 font-body text-sm focus-visible:outline-2"
      />
      {open && query.trim() && (
        <div className="themed-person-search-results absolute z-20 mt-1.5 max-h-80 w-full overflow-y-auto rounded-card shadow-none">
          {loading && (
            <p className="themed-person-search-muted px-4 py-3 text-sm">
              {lang === "hi" ? "खोज रहे हैं…" : "Searching…"}
            </p>
          )}
          {!loading && results.length === 0 && (
            <p className="themed-person-search-muted px-4 py-3 text-sm">
              {lang === "hi"
                ? `"${query}" के लिए कोई नहीं मिला।`
                : `No one matches "${query}".`}
            </p>
          )}
          {!loading &&
            results.map((p) => {
              const displayName = fullName(p, lang);
              const englishName = fullName(p, "en");

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPerson(p.id);
                    setOpen(false);
                    setQuery(displayName);
                  }}
                  className="themed-person-search-result flex w-full flex-col items-start px-4 py-2.5 text-left last:border-0"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="themed-person-search-name font-display text-sm font-semibold">
                      {displayName}
                      {p.maidenName ? ` (née ${p.maidenName})` : ""}
                    </span>
                    {lang === "hi" && p.hindiName && (
                      <span className="themed-person-search-muted text-xs">
                        ({englishName})
                      </span>
                    )}
                    {lang === "en" && p.hindiName && (
                      <span className="themed-person-search-language px-1.5 py-0.5 text-[11px]">
                        {p.hindiName}
                      </span>
                    )}
                  </div>
                  <span className="themed-person-search-muted text-xs">
                    {p.birthDate?.slice(0, 4) ?? "?"}
                    {p.deathDate ? `–${p.deathDate.slice(0, 4)}` : ""}
                    {p.birthPlace ? ` · ${p.birthPlace}` : ""}
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
