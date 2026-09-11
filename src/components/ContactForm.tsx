"use client";
import { useState } from "react";

export default function ContactForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050817]/75 backdrop-blur-sm px-4">
      <div className="lineage-modal w-full max-w-sm p-5">
        <h2 className="mb-1 font-display text-xl font-semibold text-white">
          Contact us
        </h2>
        {submitted ? (
          <p className="text-sm text-lineage">
            Thanks — we'll get back to you.
          </p>
        ) : (
          <form onSubmit={submit} className="lineage-form space-y-4">
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="lineage-input"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className="lineage-input"
            />
            <textarea
              required
              rows={4}
              placeholder="Message"
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
              className="lineage-input"
            />
            {error && <p className="text-sm text-rose">{error}</p>}
            <div className="flex flex-wrap gap-2 border-t border-[#202944] pt-4">
              <button type="submit" className="lineage-primary-action">
                Send
              </button>
              <button
                type="button"
                onClick={onClose}
                className="lineage-secondary-action"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
