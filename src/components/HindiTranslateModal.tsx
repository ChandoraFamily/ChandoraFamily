"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

interface HindiTranslateModalProps {
  onClose: () => void;
  onTranslated: () => void;
}

export default function HindiTranslateModal({
  onClose,
  onTranslated,
}: HindiTranslateModalProps) {
  const { lang, setLang, t } = useLanguage();
  const [translating, setTranslating] = useState(false);
  const [forceAll, setForceAll] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    total?: number;
    totalPersons?: number;
    updatedCount?: number;
    updated?: number;
    message?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartTranslation = async () => {
    setTranslating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/translate-names", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: true, forceAll }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to translate names");
      }

      setResult(data);
      onTranslated();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error translating names to Hindi.",
      );
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040614]/80 px-4 backdrop-blur-sm">
      <div className="lineage-modal w-full max-w-lg overflow-hidden border border-amber-500/40 bg-[#0c1228] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#1f2947] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-xl">
              🇮🇳
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                {lang === "hi"
                  ? "हिंदी नाम अनुवाद व डेटाबेस सिंक्रनाइज़ेशन"
                  : "Hindi Name Translation & Database Sync"}
              </h2>
              <p className="text-xs text-[#8995b8]">
                {lang === "hi"
                  ? "मुफ्त ट्रांसलिटरेशन टूल द्वारा सभी परिजनों के नामों का हिंदी में अनुवाद करें।"
                  : "Translate family names into Hindi Devanagari and persist to database."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-[#192242] hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Feature Explanation & Rules */}
        <div className="my-4 space-y-3 text-xs text-[#9eb0d6]">
          <div className="rounded-xl border border-[#212c4c] bg-[#101732] p-3.5 space-y-2">
            <p className="font-semibold text-amber-300 flex items-center gap-1.5">
              <span>✦</span>
              <span>
                {lang === "hi"
                  ? "भाषा नियम व स्वचालित बैकअप"
                  : "Language Rules & Fallback Handling"}
              </span>
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-[#8e9ec2] leading-relaxed">
              <li>
                <strong className="text-slate-200">
                  {lang === "hi" ? "हिंदी नाम उपलब्ध:" : "Hindi name available:"}
                </strong>{" "}
                {lang === "hi"
                  ? "जब आप हिंदी भाषा चुनते हैं, तो देवनागरी में हिंदी नाम दिखाया जाएगा।"
                  : "When viewer switches to Hindi, their Hindi name is displayed everywhere in the tree and search."}
              </li>
              <li>
                <strong className="text-amber-300">
                  {lang === "hi" ? "यदि हिंदी नाम नहीं है:" : "If no Hindi name available:"}
                </strong>{" "}
                <span className="text-amber-200/90">
                  {lang === "hi"
                    ? "सिस्टम स्वचालित रूप से उनका मूल अंग्रेजी नाम प्रदर्शित करेगा।"
                    : "The system automatically falls back and shows their English name."}
                </span>
              </li>
              <li>
                <strong className="text-slate-200">
                  {lang === "hi" ? "मुफ्त अनुवाद:" : "Free translation:"}
                </strong>{" "}
                {lang === "hi"
                  ? "Google इनपुट टूल्स और ध्वन्यात्मक (phonetic) अनुवाद पुस्तकालय द्वारा सीधे डेटाबेस में सहेजा जाता है।"
                  : "Uses free Google Input transliteration and phonetic genealogy dictionary to translate into database."}
              </li>
            </ul>
          </div>

          {/* Force Re-translation Toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-1 text-slate-300 select-none">
            <input
              type="checkbox"
              checked={forceAll}
              onChange={(e) => setForceAll(e.target.checked)}
              className="rounded border-[#34426b] bg-[#0c1228] text-amber-500 focus:ring-amber-400"
            />
            <span>
              {lang === "hi"
                ? "मौजूदा हिंदी नामों को भी पुनः अनुवादित करें (ओवरराइट)"
                : "Re-translate existing Hindi names as well (overwrite all)"}
            </span>
          </label>
        </div>

        {/* Results / Error status */}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>✓</span>
              <span>
                {lang === "hi"
                  ? `सफलतापूर्वक ${result.updatedCount ?? result.updated ?? 0} परिजनों के हिंदी नाम सहेजे गए!`
                  : `Successfully translated and saved ${result.updatedCount ?? result.updated ?? 0} names in database!`}
              </span>
            </p>
            <p className="text-emerald-400/80">
              {lang === "hi"
                ? `कुल ${result.totalPersons ?? result.total ?? 0} परिजनों की जांच की गई।`
                : `Checked total of ${result.totalPersons ?? result.total ?? 0} family records.`}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1f2947] pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {lang === "hi" ? "वर्तमान दृश्य:" : "Current View:"}
            </span>
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
            >
              <span>{lang === "hi" ? "हिंदी active" : "English active"}</span>
              <span className="text-[10px]">⇄ बदलें</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="lineage-secondary-action px-3 py-1.5 text-xs"
            >
              {t("common.close", "Close")}
            </button>
            <button
              type="button"
              disabled={translating}
              onClick={handleStartTranslation}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-amber-400 active:scale-95 disabled:opacity-50"
            >
              {translating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>
                    {lang === "hi" ? "अनुवाद हो रहा है…" : "Translating to DB…"}
                  </span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>
                    {lang === "hi"
                      ? "अनुवाद शुरू करें और सहेजें"
                      : "Translate & Save to DB"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
