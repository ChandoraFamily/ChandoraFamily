"use client";

import { useState } from "react";
import PersonSearch from "./PersonSearch";

interface RelationshipFinderProps {
  onClose: () => void;
}

export default function RelationshipFinder({
  onClose,
}: RelationshipFinderProps) {
  const [idA, setIdA] = useState<string | null>(null);
  const [idB, setIdB] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const find = async () => {
    if (!idA || !idB) {
      setError("Pick both people first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/relationships/describe?a=${encodeURIComponent(idA)}&b=${encodeURIComponent(idB)}`,
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "Failed to compute relationship.");
      setResult(json.data.description);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050817]/75 backdrop-blur-sm px-4">
      <div className="lineage-modal w-full max-w-md p-5">
        <h2 className="mb-1 font-display text-xl font-semibold text-white">
          Find relationship
        </h2>
        <div className="space-y-3">
          <div>
            <label className="lineage-label">Person 1</label>
            <PersonSearch
              onSelectPerson={setIdA}
              placeholder="Search person 1…"
            />
          </div>
          <div>
            <label className="lineage-label">Person 2</label>
            <PersonSearch
              onSelectPerson={setIdB}
              placeholder="Search person 2…"
            />
          </div>
          {error && <p className="text-sm text-rose">{error}</p>}
          {result && <p className="lineage-result">{result}</p>}
          <div className="flex flex-wrap gap-2 border-t border-[#202944] pt-4">
            <button
              onClick={find}
              disabled={loading}
              className="lineage-primary-action disabled:opacity-50"
            >
              {loading ? "Checking…" : "Find relationship"}
            </button>
            <button onClick={onClose} className="lineage-secondary-action">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
