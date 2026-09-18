"use client";

import { useState } from "react";
import type { Person, PersonInput, Gender } from "@/types/person";
import { useLanguage } from "@/lib/language-context";

interface PersonFormProps {
  initial?: Person;
  onSaved: (person: Person) => Promise<void> | void;
  onCancel: () => void;
  defaultValues?: Partial<PersonInput>;
  submitLabel?: string;
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
  hindiName: "",
};

export default function PersonForm({
  initial,
  onSaved,
  onCancel,
  defaultValues,
  submitLabel,
}: PersonFormProps) {
  const { lang, t } = useLanguage();
  const [form, setForm] = useState<PersonInput>(
    initial
      ? {
          firstName: initial.firstName,
          middleName: initial.middleName,
          lastName: initial.lastName,
          hindiName: initial.hindiName ?? "",
          maidenName: initial.maidenName,
          gender: initial.gender,
          birthDate: initial.birthDate ?? "",
          deathDate: initial.deathDate ?? "",
          birthPlace: initial.birthPlace ?? "",
          deathPlace: initial.deathPlace ?? "",
          bio: initial.bio ?? "",
        }
      : {
          ...emptyForm,
          ...defaultValues,
        },
  );
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateSuccess, setTranslateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleAutoTranslate = async () => {
    const englishFullName = [form.firstName, form.middleName, form.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!englishFullName) {
      setError(
        lang === "hi"
          ? "कृपया पहले प्रथम नाम या उपनाम दर्ज करें।"
          : "Please enter a name in the English fields first.",
      );
      return;
    }

    setTranslating(true);
    setError(null);
    setTranslateSuccess(false);

    try {
      const res = await fetch("/api/translate-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: englishFullName }),
      });
      const data = await res.json();
      if (data.hindiName) {
        set("hindiName", data.hindiName);
        setTranslateSuccess(true);
        setTimeout(() => setTranslateSuccess(false), 3000);
      } else {
        throw new Error(data.error || "Could not translate name");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to auto-translate name to Hindi.",
      );
    } finally {
      setTranslating(false);
    }
  };

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
      await onSaved(json.data as Person);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="lineage-form space-y-4">
      {/* English Names */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label={t("form.firstName", "First Name")} required>
          <input
            required
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={inputClass}
            placeholder="e.g. Ajay"
          />
        </Field>
        <Field label={t("form.middleName", "Middle Name")}>
          <input
            value={form.middleName ?? ""}
            onChange={(e) => set("middleName", e.target.value)}
            className={inputClass}
            placeholder="e.g. Kumar"
          />
        </Field>
        <Field label={t("form.lastName", "Last Name")}>
          <input
            value={form.lastName ?? ""}
            onChange={(e) => set("lastName", e.target.value)}
            className={inputClass}
            placeholder="e.g. Chandora"
          />
        </Field>
      </div>

      {/* Hindi Name Option */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/15 p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <span>🇮🇳</span>
            <span>{t("form.hindiName", "Hindi Name (हिंदी में नाम)")}</span>
          </label>
          <button
            type="button"
            onClick={handleAutoTranslate}
            disabled={translating}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30 active:scale-95 transition disabled:opacity-50"
            title="Automatically transliterate English name into Hindi Devanagari"
          >
            {translating ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                <span>{t("form.translating", "Translating...")}</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>
                  {t("form.autoTranslate", "Auto-Translate to Hindi")}
                </span>
              </>
            )}
          </button>
        </div>

        <input
          value={form.hindiName ?? ""}
          onChange={(e) => set("hindiName", e.target.value)}
          placeholder="उदा. अजय कुमार चंदोरा"
          className={`${inputClass} border-amber-500/40 focus:border-amber-400 font-medium text-amber-100 placeholder:text-amber-500/40`}
        />

        {translateSuccess && (
          <p className="text-xs text-emerald-400 animate-fadeIn">
            ✓ Translated into Hindi! You can modify the spelling if desired.
          </p>
        )}

        <p className="text-[11px] text-amber-300/70 leading-relaxed">
          {t(
            "form.hindiNameHelp",
            "Shown when viewer switches to Hindi language. Defaults to English name if left empty.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t("form.maidenName", "Maiden name")}>
          <input
            value={form.maidenName ?? ""}
            onChange={(e) => set("maidenName", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label={t("person.gender", "Gender")}>
          <select
            value={form.gender}
            onChange={(e) => set("gender", e.target.value as Gender)}
            className={inputClass}
          >
            <option value="unknown">
              {t("person.gender.unknown", "Unspecified")}
            </option>
            <option value="female">
              {t("person.gender.female", "Female")}
            </option>
            <option value="male">{t("person.gender.male", "Male")}</option>
            <option value="other">{t("person.gender.other", "Other")}</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("person.birth", "Born")}>
          <input
            type="text"
            placeholder="YYYY or YYYY-MM-DD"
            value={form.birthDate ?? ""}
            onChange={(e) => set("birthDate", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("person.death", "Died")}>
          <input
            type="text"
            placeholder="YYYY or YYYY-MM-DD"
            value={form.deathDate ?? ""}
            onChange={(e) => set("deathDate", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("person.birthPlace", "Birthplace")}>
          <input
            value={form.birthPlace ?? ""}
            onChange={(e) => set("birthPlace", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("person.deathPlace", "Place of death")}>
          <input
            value={form.deathPlace ?? ""}
            onChange={(e) => set("deathPlace", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t("person.bio", "Notes & Biography")}>
        <textarea
          value={form.bio ?? ""}
          onChange={(e) => set("bio", e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex flex-wrap gap-2 border-t border-[#202944] pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-card lineage-primary-action disabled:opacity-50"
        >
          {saving
            ? t("form.saving", "Saving…")
            : submitLabel
            ? submitLabel
            : initial
            ? t("form.save", "Save changes")
            : t("form.save", "Add to tree")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-card lineage-secondary-action"
        >
          {t("form.cancel", "Cancel")}
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
