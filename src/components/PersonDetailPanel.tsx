"use client";

import { useEffect, useState } from "react";
import type { Person } from "@/types/person";
import PersonForm from "./PersonForm";
import SuggestEditForm from "./SuggestEditForm";
import { useAuth } from "@/lib/auth-context";
import { Clipboard } from "@capacitor/clipboard";
import LinkRelativeForm from "./LinkRelativeForm";

interface PersonDetailPanelProps {
  personId: string | null;
  onClose: () => void;
  onChanged: () => void;
  onNavigate: (personId: string) => void;
}

type Mode = "view" | "edit" | "add-relative" | "suggest-edit" | "link-relative";

export default function PersonDetailPanel({
  personId,
  onClose,
  onChanged,
  onNavigate,
}: PersonDetailPanelProps) {
  const { isLoggedIn } = useAuth();
  const [person, setPerson] = useState<Person | null>(null);
  const [related, setRelated] = useState<Person[]>([]);
  const [mode, setMode] = useState<Mode>("view");
  const [relativeType, setRelativeType] = useState<
    "parent" | "child" | "spouse"
  >("child");

  useEffect(() => {
    if (!personId) return;
    setMode("view");
    fetch(`/api/persons/${personId}`)
      .then((res) => res.json())
      .then((json) => setPerson(json.data));
  }, [personId]);

  useEffect(() => {
    if (!person) return;
    const ids = [...person.parentIds, ...person.spouseIds];
    Promise.all(
      ids.map((id) =>
        fetch(`/api/persons/${id}`)
          .then((r) => r.json())
          .then((j) => j.data),
      ),
    ).then((people) => setRelated(people.filter(Boolean)));
  }, [person]);

  if (!personId) return null;

  const handleDelete = async () => {
    if (!person) return;
    if (
      !confirm(`Remove ${person.firstName} ${person.lastName} from the tree?`)
    )
      return;
    await fetch(`/api/persons/${person.id}`, { method: "DELETE" });
    onChanged();
    onClose();
  };

  const titleFor = (m: Mode) =>
    m === "view"
      ? "Record"
      : m === "edit"
      ? "Edit record"
      : m === "add-relative"
      ? "Add relative"
      : m === "link-relative"
      ? "Link existing person"
      : "Suggest an edit";

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-[#202944] bg-[#090d23] shadow-[-20px_0_50px_rgba(0,0,0,.18)] sm:relative sm:z-0">
      <div className="flex items-center justify-between border-b border-[#202944] px-5 py-4">
        <h2 className="font-display text-lg font-semibold text-white">
          {titleFor(mode)}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="text-xl leading-none text-[#8993ad] hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {!person && <p className="text-sm text-[#8993ad]">Loading…</p>}

        {person && mode === "view" && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 lineage-id-box rounded-xl px-3 py-2">
                <span className="truncate font-mono text-xs text-[#8993ad]">
                  {person.id}
                </span>
                <button
                  onClick={async () =>
                    await Clipboard.write({ string: person.id })
                  }
                  className="shrink-0 text-xs text-[#a98cff] hover:underline"
                >
                  Copy
                </button>
              </div>
              <p className="font-display text-2xl font-semibold text-white">
                {person.firstName} {person.middleName} {person.lastName}
              </p>
              {person.maidenName && (
                <p className="text-sm text-[#8993ad]">
                  née {person.maidenName}
                </p>
              )}
            </div>

            <dl className="lineage-detail-list space-y-2 text-sm">
              <Row
                label="Born"
                value={
                  [person.birthDate, person.birthPlace]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
              <Row
                label="Died"
                value={
                  [person.deathDate, person.deathPlace]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
              <Row label="Gender" value={person.gender} />
            </dl>

            {person.bio && (
              <p className="border-t border-[#202944] pt-3 text-sm leading-relaxed text-[#aeb7cf]">
                {person.bio}
              </p>
            )}

            {related.length > 0 && (
              <div className="border-t border-[#202944] pt-3">
                <p className="mb-2 text-xs font-medium text-[#8993ad]">
                  Connected records
                </p>
                <ul className="space-y-1">
                  {related.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => onNavigate(r.id)}
                        className="text-sm text-[#a98cff] underline decoration-[#8d68ff]/40 underline-offset-2 hover:decoration-[#b9a8ff]"
                      >
                        {r.firstName} {r.middleName} {r.lastName}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-[#202944] pt-4">
              {isLoggedIn && (
                <>
                  <button
                    onClick={() => setMode("edit")}
                    className="lineage-secondary-action px-3 py-1.5 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setMode("add-relative")}
                    className="lineage-secondary-action px-3 py-1.5 text-sm"
                  >
                    Add relative
                  </button>
                  <button
                    onClick={handleDelete}
                    className="lineage-danger-action px-3 py-1.5 text-sm"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setMode("link-relative")}
                    className="lineage-suggest-action px-3 py-1.5 text-sm"
                  >
                    Link existing relative
                  </button>
                </>
              )}
              <button
                className="lineage-suggest-action px-3 py-1.5 text-sm"
                onClick={() => setMode("suggest-edit")}
              >
                Suggest Edit
              </button>
            </div>
          </div>
        )}

        {person && mode === "edit" && (
          <PersonForm
            initial={person}
            onCancel={() => setMode("view")}
            onSaved={async (updated) => {
              setPerson(updated);
              setMode("view");
              onChanged();
            }}
          />
        )}

        {person && mode === "suggest-edit" && (
          <SuggestEditForm
            person={person}
            onCancel={() => setMode("view")}
            onDone={() => setMode("view")}
          />
        )}

        {person && mode === "link-relative" && (
          <LinkRelativeForm
            person={person}
            onCancel={() => setMode("view")}
            onDone={() => {
              onChanged();
              onNavigate(person.id);
              setMode("view");
            }}
          />
        )}

        {person && mode === "add-relative" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#8993ad]">
                Relationship
              </label>
              <select
                value={relativeType}
                onChange={(e) =>
                  setRelativeType(e.target.value as typeof relativeType)
                }
                className="lineage-input"
              >
                <option value="parent">New parent</option>
                <option value="child">New child</option>
                <option value="spouse">New spouse / partner</option>
              </select>
            </div>
            <PersonForm
              onCancel={() => setMode("view")}
              onSaved={async (newPerson) => {
                const type =
                  relativeType === "spouse" ? "spouse" : "parent-child";
                const personId =
                  relativeType === "parent" ? newPerson.id : person.id;
                const relatedId =
                  relativeType === "parent" ? person.id : newPerson.id;
                await fetch("/api/relationships", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ type, personId, relatedId }),
                });
                onChanged();
                onNavigate(person.id);
                setMode("view");
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#8993ad]">{label}</dt>
      <dd className="text-right text-[#e7ebfb]">{value}</dd>
    </div>
  );
}
