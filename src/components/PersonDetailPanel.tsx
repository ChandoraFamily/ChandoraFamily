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
  const [shareCopied, setShareCopied] = useState(false);

  const getShareUrl = (p: Person) => `https://chandora.in/?person=${p.id}`;

  const getShareText = (p: Person) => {
    const name = fullName(p, lang);
    const hindiPart = p.hindiName ? ` (${p.hindiName})` : "";
    const birthStr = [p.birthDate, p.birthPlace].filter(Boolean).join(" · ");
    const deathStr = [p.deathDate, p.deathPlace].filter(Boolean).join(" · ");
    const lines = [
      `🌳 *Chandora Family Tree & Lineage*`,
      `👤 *${name}${hindiPart}*`,
      birthStr ? `🗓 Born: ${birthStr}` : null,
      deathStr ? `🕊 Died: ${deathStr}` : null,
      p.bio
        ? `📜 ${p.bio.slice(0, 160)}${p.bio.length > 160 ? "..." : ""}`
        : null,
      ``,
      `🔗 Explore the official Chandora lineage & ancestry records at {${getShareUrl(
        p,
      )}`,
      `#Chandora #Lineage #FamilyTree`,
    ].filter(Boolean);
    return lines.join("\n");
  };

  const handleShareWhatsApp = () => {
    if (!person) return;
    const text = getShareText(person);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      text,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareFacebook = () => {
    if (!person) return;
    const shareUrl = getShareUrl(person);
    const name = fullName(person, lang);
    const quote = `Chandora Family Tree Record: ${name} - Explore our ancestral Chandora lineage at chandora.in`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl,
    )}&quote=${encodeURIComponent(quote)}`;
    window.open(fbUrl, "_blank", "width=600,height=500,noopener,noreferrer");
  };

  const handleNativeShareOrCopy = async () => {
    if (!person) return;
    const text = getShareText(person);
    const shareUrl = getShareUrl(person);
    const name = fullName(person, lang);
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: `Chandora Family Tree: ${name}`,
          text,
          url: shareUrl,
        });
        return;
      } catch {
        // User dismissed or share failed, fallback to copy
      }
    }
    await Clipboard.write({ string: `${text}\nhttps://chandora.in/` });
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

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
                  relation:
                    r.gender === "female"
                      ? "Mother"
                      : r.gender === "male"
                      ? "Father"
                      : "Parent",
                  relationHi:
                    r.gender === "female"
                      ? "माता"
                      : r.gender === "male"
                      ? "पिता"
                      : "माता-पिता",
                  type: "parent",
                });
              } else if (isSpouse) {
                list.push({
                  person: r,
                  relation:
                    r.gender === "female"
                      ? "Wife"
                      : r.gender === "male"
                      ? "Husband"
                      : "Spouse",
                  relationHi:
                    r.gender === "female"
                      ? "पत्नी"
                      : r.gender === "male"
                      ? "पति"
                      : "जीवनसाथी",
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
                    .join(" · ") || "N/A"
                }
              />
              <Row
                label="Died"
                value={
                  [person.deathDate, person.deathPlace]
                    .filter(Boolean)
                    .join(" · ") || "N/A"
                }
              />
              <Row label="Gender" value={person.gender} />
            </dl>

            {person.bio && (
              <p className="border-t border-[#202944] pt-3 text-sm leading-relaxed text-[#aeb7cf]">
                {person.bio}
              </p>
            )}

            {/* ========================================================= */}
            {/* SOCIAL SHARING BLOCK (WhatsApp, Facebook, YouTube, Share) */}
            {/* ========================================================= */}
            <div className="border-t border-[#202944] pt-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
                  <svg
                    className="w-3.5 h-3.5 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                  {lang === "hi"
                    ? "वंशज विवरण साझा करें"
                    : "Share Chandora Record"}
                </span>
                {shareCopied && (
                  <span className="text-[11px] font-bold text-emerald-400 animate-pulse">
                    {lang === "hi"
                      ? "✓ कॉपी किया गया"
                      : "✓ Copied to clipboard"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8993ad] mb-2.5 leading-snug">
                {lang === "hi"
                  ? "चान्दोरा वंशज विवरण को व्हाट्सएप, फेसबुक और परिजनों से सीधे साझा करें"
                  : "Share this lineage record with family & relatives across social networks"}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-300 shadow-sm transition hover:bg-emerald-800/40 hover:border-emerald-400 hover:text-white active:scale-95 cursor-pointer"
                  title="Share on WhatsApp"
                >
                  <svg
                    className="h-4 w-4 fill-emerald-400 shrink-0"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm5.79 14.07c-.24.68-1.4 1.25-1.92 1.33-.5.08-1.15.11-3.72-.95-3.28-1.36-5.4-4.69-5.56-4.9-.16-.22-1.33-1.77-1.33-3.37s.84-2.39 1.14-2.72c.3-.33.65-.41.87-.41.22 0 .43 0 .62.01.2.01.47-.08.73.56.27.68.92 2.25.99 2.42.08.16.14.35.03.57-.11.22-.16.35-.33.54-.16.19-.35.43-.5.58-.16.16-.33.34-.14.67.19.33.84 1.39 1.8 2.25 1.24 1.1 2.28 1.44 2.61 1.6.33.16.52.14.71-.08.19-.22.82-.95 1.04-1.28.22-.33.44-.27.73-.16.3.11 1.88.89 2.2 1.05.33.16.54.24.62.38.08.14.08.82-.16 1.5z" />
                  </svg>
                  <span>WhatsApp</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={handleShareFacebook}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-950/40 px-3 py-2 text-xs font-semibold text-blue-300 shadow-sm transition hover:bg-blue-800/40 hover:border-blue-400 hover:text-white active:scale-95 cursor-pointer"
                  title="Share on Facebook"
                >
                  <svg
                    className="h-4 w-4 fill-blue-400 shrink-0"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Facebook</span>
                </button>

                {/* YouTube */}
                {/* <button
                  type="button"
                  onClick={handleShareYouTube}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300 shadow-sm transition hover:bg-red-800/40 hover:border-red-400 hover:text-white active:scale-95 cursor-pointer"
                  title="Search & Watch Chandora Lineage on YouTube"
                >
                  <svg
                    className="h-4 w-4 fill-red-400 shrink-0"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span>YouTube</span>
                </button> */}

                {/* Share / Copy Summary */}
                <button
                  type="button"
                  onClick={handleNativeShareOrCopy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-950/40 px-3 py-2 text-xs font-semibold text-violet-300 shadow-sm transition hover:bg-violet-800/40 hover:border-violet-400 hover:text-white active:scale-95 cursor-pointer"
                  title="Copy details or share via device"
                >
                  <svg
                    className="h-4 w-4 text-violet-400 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    {shareCopied
                      ? lang === "hi"
                        ? "कॉपी हो गया!"
                        : "Copied!"
                      : lang === "hi"
                      ? "शेयर / कॉपी"
                      : "Share / Copy"}
                  </span>
                </button>
              </div>
            </div>

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
