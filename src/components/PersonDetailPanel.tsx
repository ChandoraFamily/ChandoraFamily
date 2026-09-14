"use client";

import { useEffect, useState } from "react";
import type { Person, ConnectedRelative } from "@/types/person";
import PersonForm from "./PersonForm";
import SuggestEditForm from "./SuggestEditForm";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { fullName } from "@/lib/formatName";
import { Clipboard } from "@capacitor/clipboard";
import LinkRelativeForm from "./LinkRelativeForm";

interface PersonDetailPanelProps {
  personId: string | null;
  onClose: () => void;
  onChanged: () => void;
  onNavigate: (personId: string) => void;
  onFocusPerson?: (personId: string) => void;
  adminPersonId?: string;
  onFocusAdmin?: () => void;
  onSetDefaultFocus?: (personId: string) => void;
  currentFocusId?: string;
}

type Mode = "view" | "edit" | "add-relative" | "suggest-edit" | "link-relative";

export default function PersonDetailPanel({
  personId,
  onClose,
  onChanged,
  onNavigate,
  onFocusPerson,
  adminPersonId,
  onFocusAdmin,
  onSetDefaultFocus,
  currentFocusId,
}: PersonDetailPanelProps) {
  const { isLoggedIn, isAdmin } = useAuth();
  const { lang, t } = useLanguage();
  const [person, setPerson] = useState<Person | null>(null);
  const [connected, setConnected] = useState<ConnectedRelative[]>([]);
  const [mode, setMode] = useState<Mode>("view");
  const [relativeType, setRelativeType] = useState<
    "parent" | "child" | "spouse"
  >("child");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!personId) return;
    setMode("view");
    fetch(`/api/persons/${personId}`)
      .then((res) => res.json())
      .then((json) => {
        setPerson(json.data);
        if (Array.isArray(json.connected)) {
          setConnected(json.connected);
        } else if (json.data) {
          // Fallback if connected array wasn't attached
          const p: Person = json.data;
          const ids = [...p.parentIds, ...p.spouseIds];
          Promise.all(
            ids.map((id) =>
              fetch(`/api/persons/${id}`)
                .then((r) => r.json())
                .then((j) => j.data),
            ),
          ).then((people: (Person | null)[]) => {
            const list: ConnectedRelative[] = [];
            for (const r of people) {
              if (!r) continue;
              const isParent = p.parentIds.includes(r.id);
              const isSpouse = p.spouseIds.includes(r.id);
              if (isParent) {
                list.push({
                  person: r,
                  relation: r.gender === "female" ? "Mother" : r.gender === "male" ? "Father" : "Parent",
                  relationHi: r.gender === "female" ? "माता" : r.gender === "male" ? "पिता" : "माता-पिता",
                  type: "parent",
                });
              } else if (isSpouse) {
                list.push({
                  person: r,
                  relation: r.gender === "female" ? "Wife" : r.gender === "male" ? "Husband" : "Spouse",
                  relationHi: r.gender === "female" ? "पत्नी" : r.gender === "male" ? "पति" : "जीवनसाथी",
                  type: "spouse",
                });
              }
            }
            setConnected(list);
          });
        }
      })
      .catch((err) => console.error("Error loading person details:", err));
  }, [personId, refreshKey]);

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
              <div>
                <p className="font-display text-2xl font-semibold text-white">
                  {fullName(person, lang)}
                </p>
                {/* When viewing in Hindi and hindiName exists, show English name subtly below */}
                {lang === "hi" && person.hindiName?.trim() && (
                  <p className="text-xs text-[#a3b3d6] font-medium mt-0.5">
                    {fullName(person, "en")}
                  </p>
                )}
                {/* When viewing in English and hindiName exists, show Hindi name subtly below */}
                {lang === "en" && person.hindiName?.trim() && (
                  <p className="text-xs text-amber-300/80 font-medium mt-0.5">
                    हिंदी: {person.hindiName}
                  </p>
                )}
              </div>
              {person.maidenName && (
                <p className="text-sm text-[#8993ad]">
                  née {person.maidenName}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {currentFocusId === person.id ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#8a5cff]/60 bg-[#1e1742] px-2.5 py-1 text-xs font-medium text-[#cfc2ff]">
                    <span>✦</span>
                    <span>Current Focus Person</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (onFocusPerson) onFocusPerson(person.id);
                      else onNavigate(person.id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#2c3758] bg-[#111733] px-2.5 py-1 text-xs font-medium text-[#a7b5dc] transition hover:border-[#8a5cff]/60 hover:bg-[#192044] hover:text-white"
                  >
                    <span>🎯</span>
                    <span>Focus Tree Here</span>
                  </button>
                )}

                {person.id === adminPersonId ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
                    <span>👑</span>
                    <span>Admin Person</span>
                  </span>
                ) : (
                  onFocusAdmin && (
                    <button
                      type="button"
                      onClick={onFocusAdmin}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#2a3450] bg-[#0e1329] px-2 py-1 text-xs text-slate-400 transition hover:border-amber-500/50 hover:text-amber-300"
                      title="Switch focus to Admin record"
                    >
                      <span>👑</span>
                      <span>Switch to Admin</span>
                    </button>
                  )
                )}

                {isAdmin && onSetDefaultFocus && (
                  <button
                    type="button"
                    onClick={() => onSetDefaultFocus(person.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#3b476b] bg-[#141b38] px-2 py-1 text-xs text-slate-300 transition hover:border-[#8a5cff] hover:text-white"
                    title="Set this person as default tree focus for all visitors"
                  >
                    <span>📌</span>
                    <span>Set as Default Focus</span>
                  </button>
                )}
              </div>
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

            {connected.length > 0 ? (
              <div className="border-t border-[#202944] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8993ad]">
                    {lang === "hi"
                      ? `जुड़े हुए संबंधी (${connected.length})`
                      : `Connected Records (${connected.length})`}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {connected.map((item) => {
                    const r = item.person;
                    const relationLabel =
                      lang === "hi" ? item.relationHi : item.relation;

                    const badgeStyles =
                      item.type === "parent"
                        ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                        : item.type === "spouse"
                        ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
                        : item.type === "child"
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                        : item.type === "sibling"
                        ? "border-sky-400/40 bg-sky-500/15 text-sky-300"
                        : "border-purple-400/40 bg-purple-500/15 text-purple-300";

                    return (
                      <div
                        key={`${item.type}-${r.id}`}
                        className="group flex items-center justify-between gap-2.5 rounded-lg border border-[#202944] bg-[#0c1228] px-3 py-2 transition hover:border-violet-500/40 hover:bg-[#121935]"
                      >
                        <button
                          type="button"
                          onClick={() => onNavigate(r.id)}
                          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                          title={
                            lang === "hi"
                              ? `${fullName(r, lang)} के विवरण पर जाएं`
                              : `View ${fullName(r, lang)}`
                          }
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
                              r.gender === "female"
                                ? "bg-pink-500/20 text-pink-300"
                                : "bg-indigo-500/20 text-indigo-300"
                            }`}
                          >
                            {r.gender === "female" ? "♀" : "♂"}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#c8d1ea] group-hover:text-amber-300 group-hover:underline decoration-amber-400/40 transition-colors">
                            {fullName(r, lang)}
                          </span>
                        </button>

                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide shadow-xs ${badgeStyles}`}
                        >
                          {relationLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border-t border-[#202944] pt-3 text-xs text-[#8993ad]">
                {lang === "hi"
                  ? "कोई जुड़े हुए संबंधी नहीं मिले।"
                  : "No connected records found."}
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
              setRefreshKey((k) => k + 1);
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
              setRefreshKey((k) => k + 1);
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
                setRefreshKey((k) => k + 1);
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
