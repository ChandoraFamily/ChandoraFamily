"use client";

import { useState } from "react";
import type { Person } from "@/types/person";
import { useAuth } from "@/lib/auth-context";

interface SuggestEditFormProps {
  person: Person;
  onDone: () => void;
  onCancel: () => void;
}

export default function SuggestEditForm({
  person,
  onDone,
  onCancel,
}: SuggestEditFormProps) {
  const { user } = useAuth();
  const [fields, setFields] = useState({
    firstName: person.firstName,
    lastName: person.lastName,
    birthDate: person.birthDate ?? "",
    deathDate: person.deathDate ?? "",
    birthPlace: person.birthPlace ?? "",
    deathPlace: person.deathPlace ?? "",
    bio: person.bio ?? "",
  });
  const [note, setNote] = useState("");
  const [submitterName, setSubmitterName] = useState(user?.name ?? "");
  const [submitterEmail, setSubmitterEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof typeof fields>(key: K, value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  // Only send fields that actually changed, so the admin sees a real diff.
  const buildChanges = () => {
    const changes: Record<string, string> = {};
    (Object.keys(fields) as (keyof typeof fields)[]).forEach((key) => {
      const original = (person[key] ?? "") as string;
      if (fields[key] !== original) changes[key] = fields[key] ?? "";
    });
    return changes;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const changes = buildChanges();
      if (Object.keys(changes).length === 0 && !note.trim()) {
        setError(
          "Change at least one field, or add a note, before submitting.",
        );
        setSubmitting(false);
        return;
      }
      const res = await fetch(`/api/persons/${person.id}/suggest-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes,
          note: note.trim() || undefined,
          submittedByName: submitterName.trim() || undefined,
          submittedByEmail: submitterEmail.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "Failed to submit suggestion.");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="lineage-form space-y-4">
        <p className="text-sm text-[#a98cff]">
          Thanks — your suggestion has been sent to an admin for review.
        </p>
        <button onClick={onDone} className="lineage-secondary-action">
          Back to record
        </button>
      </div>
    );
  }

  const inputClass = "lineage-input";

  return (
    <form onSubmit={submit} className="lineage-form space-y-4">
      <p className="text-xs text-[#8993ad]">
        Suggest a correction to this record. An admin will review it before
        anything changes.
      </p>

      {!user && (
        <div className="grid grid-cols-2 gap-3">
          <label className="lineage-label">
            <span className="mb-1 block">Your name</span>
            <input
              value={submitterName}
              onChange={(e) => setSubmitterName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="lineage-label">
            <span className="mb-1 block">Your email</span>
            <input
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="lineage-label">
          <span className="mb-1 block">First name</span>
          <input
            value={fields.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="lineage-label">
          <span className="mb-1 block">Last name</span>
          <input
            value={fields.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="lineage-label">
          <span className="mb-1 block">Born</span>
          <input
            type="date"
            value={fields.birthDate}
            onChange={(e) => set("birthDate", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="lineage-label">
          <span className="mb-1 block">Died</span>
          <input
            type="date"
            value={fields.deathDate}
            onChange={(e) => set("deathDate", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="lineage-label">
          <span className="mb-1 block">Birthplace</span>
          <input
            value={fields.birthPlace}
            onChange={(e) => set("birthPlace", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="lineage-label">
          <span className="mb-1 block">Place of death</span>
          <input
            value={fields.deathPlace}
            onChange={(e) => set("deathPlace", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="lineage-label">
        <span className="mb-1 block">Notes</span>
        <textarea
          rows={3}
          value={fields.bio}
          onChange={(e) => set("bio", e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="lineage-label">
        <span className="mb-1 block">
          Why are you suggesting this change? (optional, but helps the reviewer)
        </span>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={inputClass}
        />
      </label>

      {error && <p className="text-sm text-rose">{error}</p>}

      <div className="flex flex-wrap gap-2 border-t border-[#202944] pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="lineage-primary-action disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send suggestion"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="lineage-secondary-action"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
