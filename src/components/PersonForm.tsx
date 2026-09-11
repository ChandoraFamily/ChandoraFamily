"use client";

import { useState } from "react";
import type { Person, PersonInput, Gender } from "@/types/person";

interface PersonFormProps {
  initial?: Person;
  onSaved: (person: Person) => void;
  onCancel: () => void;
}

const emptyForm: PersonInput = {
  firstName: "",
  lastName: "",
  gender: "unknown" as Gender,
  birthDate: "",
  deathDate: "",
  birthPlace: "",
  deathPlace: "",
  bio: "",
};

export default function PersonForm({
  initial,
  onSaved,
  onCancel,
}: PersonFormProps) {
  const [form, setForm] = useState<PersonInput>(
    initial
      ? {
          firstName: initial.firstName,
          lastName: initial.lastName,
          maidenName: initial.maidenName,
          gender: initial.gender,
          birthDate: initial.birthDate ?? "",
          deathDate: initial.deathDate ?? "",
          birthPlace: initial.birthPlace ?? "",
          deathPlace: initial.deathPlace ?? "",
          bio: initial.bio ?? "",
        }
      : emptyForm,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = initial ? `/api/persons/${initial.id}` : "/api/persons";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      onSaved(json.data as Person);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="lineage-form space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label="First name" required>
          <input
            required
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Middle Name">
          <input
            value={form.middleName ?? ""}
            onChange={(e) => set("middleName", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Last name">
          <input
            value={form.lastName ?? ""}
            onChange={(e) => set("lastName", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Maiden name">
        <input
          value={form.maidenName ?? ""}
          onChange={(e) => set("maidenName", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Gender">
        <select
          value={form.gender}
          onChange={(e) => set("gender", e.target.value as Gender)}
          className={inputClass}
        >
          <option value="unknown">Unspecified</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Born">
          <input
            type="date"
            value={form.birthDate ?? ""}
            onChange={(e) => set("birthDate", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Died">
          <input
            type="date"
            value={form.deathDate ?? ""}
            onChange={(e) => set("deathDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Birthplace">
          <input
            value={form.birthPlace ?? ""}
            onChange={(e) => set("birthPlace", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Place of death">
          <input
            value={form.deathPlace ?? ""}
            onChange={(e) => set("deathPlace", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          value={form.bio ?? ""}
          onChange={(e) => set("bio", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-rose">{error}</p>}

      <div className="flex flex-wrap gap-2 border-t border-[#202944] pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-card lineage-primary-action disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Add to tree"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-card lineage-secondary-action"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputClass = "lineage-input";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="lineage-label">
      <span className="mb-1 block">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
