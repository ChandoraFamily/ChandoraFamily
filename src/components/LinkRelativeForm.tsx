"use client";

import { useState } from "react";
import type { Person } from "@/types/person";

interface LinkRelativeFormProps {
  person: Person;
  onDone: () => void;
  onCancel: () => void;
}

type LinkType = "parent" | "child" | "spouse";

export default function LinkRelativeForm({
  person,
  onDone,
  onCancel,
}: LinkRelativeFormProps) {
  const [linkType, setLinkType] = useState<LinkType>("parent");
  const [otherId, setOtherId] = useState("");
  const [preview, setPreview] = useState<Person | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lookup = async () => {
    setError(null);
    setPreview(null);
    if (!otherId.trim()) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/persons/${otherId.trim()}`);
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "No person found with that ID.");
      setPreview(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) {
      setError("Look up a valid person ID first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const type = linkType === "spouse" ? "spouse" : "parent-child";
      const personId = linkType === "parent" ? preview.id : person.id;
      const relatedId = linkType === "parent" ? person.id : preview.id;
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, personId, relatedId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create the link.");
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-card border border-ink/25 bg-parchment-light px-3 py-2 text-sm text-ink";

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-ink-faint">
        Link {person.firstName} to an existing person already in the tree, by
        their record ID — useful when a person's second parent, or a spouse, was
        already added separately.
      </p>

      <label className="block text-xs font-medium text-ink-faint">
        <span className="mb-1 block">Relationship to {person.firstName}</span>
        <select
          value={linkType}
          onChange={(e) => setLinkType(e.target.value as LinkType)}
          className={inputClass}
        >
          <option value="parent">
            This is another parent of {person.firstName}
          </option>
          <option value="child">This is a child of {person.firstName}</option>
          <option value="spouse">
            This is a spouse/partner of {person.firstName}
          </option>
        </select>
      </label>

      <label className="block text-xs font-medium text-ink-faint">
        <span className="mb-1 block">Their person ID</span>
        <div className="flex gap-2">
          <input
            value={otherId}
            onChange={(e) => setOtherId(e.target.value)}
            placeholder="e.g. 65f2a1c9b8e4a30012ab34cd"
            className={`${inputClass} font-mono text-xs`}
          />
          <button
            type="button"
            onClick={lookup}
            disabled={checking}
            className="shrink-0 rounded-card border border-ink/25 px-3 py-2 text-sm text-ink hover:bg-parchment-dark disabled:opacity-50"
          >
            {checking ? "Checking…" : "Look up"}
          </button>
        </div>
      </label>

      {preview && (
        <div className="rounded-card border border-lineage/30 bg-lineage/10 px-3 py-2 text-sm text-teal-100">
          Found:{" "}
          <strong>
            {[preview.firstName, preview.middleName, preview.lastName]
              .filter(Boolean)
              .join(" ")}
          </strong>
          {preview.birthDate ? ` (b. ${preview.birthDate.slice(0, 4)})` : ""}
        </div>
      )}
      {error && <p className="text-sm text-rose">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !preview}
          className="rounded-card bg-ink px-4 py-2 text-sm font-medium text-parchment-light hover:bg-ink-soft disabled:opacity-50"
        >
          {saving ? "Linking…" : "Link records"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-card border border-ink/25 px-4 py-2 text-sm text-ink hover:bg-parchment-dark"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
