"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function ContactForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill user information once loaded if form fields are empty
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send message.");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit contact message:", err);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-form-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050817]/80 backdrop-blur-sm px-4"
    >
      <div className="lineage-modal w-full max-w-md p-6">
        <div className="flex items-center justify-between border-b border-[#202944] pb-3">
          <h2
            id="contact-form-title"
            className="font-display text-xl font-semibold text-white"
          >
            Contact Family Tree Admin
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-2xl leading-none text-[#8993ad] transition hover:text-white"
          >
            ×
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-2xl border border-emerald-500/30">
              ✓
            </div>
            <div>
              <p className="text-lg font-medium text-white">
                Message Sent Successfully
              </p>
              <p className="mt-1 text-sm text-[#8993ad]">
                Thank you for reaching out. We will review your message and reply
                to <span className="text-[#a98cff]">{form.email}</span> as soon as
                possible.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="lineage-primary-action px-6 py-2 text-sm"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setForm((f) => ({ ...f, message: "" }));
                }}
                className="lineage-secondary-action px-4 py-2 text-sm"
              >
                Send Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="lineage-form mt-4 space-y-4">
            <p className="text-xs text-[#8993ad]">
              Have questions, corrections, or family updates? Send a note directly to
              the tree administrators.
            </p>

            <div>
              <label
                htmlFor="contact-name"
                className="mb-1 block text-xs font-medium text-[#8993ad]"
              >
                Your Name
              </label>
              <input
                id="contact-name"
                required
                maxLength={120}
                placeholder="e.g. Ramesh Chandora"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="lineage-input w-full"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="mb-1 block text-xs font-medium text-[#8993ad]"
              >
                Your Email
              </label>
              <input
                id="contact-email"
                required
                type="email"
                maxLength={120}
                placeholder="e.g. yourname@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="lineage-input w-full"
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="mb-1 block text-xs font-medium text-[#8993ad]"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                maxLength={5000}
                placeholder="Write your question, tree correction, or note here…"
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
                className="lineage-input w-full resize-none"
              />
              <p className="mt-1 text-right text-[11px] text-[#5e6b8c]">
                {form.message.length} / 5000
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-rose/30 bg-rose/10 p-2.5 text-xs text-rose">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#202944] pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="lineage-secondary-action px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="lineage-primary-action px-5 py-2 text-sm disabled:opacity-50"
              >
                {isSubmitting ? "Sending…" : "Send Message"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
