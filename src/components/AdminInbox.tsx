"use client";

import { useEffect, useState } from "react";

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: "new" | "read";
  createdAt: string;
}

interface SuggestedEdit {
  _id: string;
  personId: string;
  submittedByName?: string;
  submittedByEmail?: string;
  note?: string;
  changes: Record<string, string>;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface AdminInboxProps {
  onClose: () => void;
  onEditApplied: () => void;
}

export default function AdminInbox({
  onClose,
  onEditApplied,
}: AdminInboxProps) {
  const [tab, setTab] = useState<"messages" | "edits">("edits");
  // const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [edits, setEdits] = useState<SuggestedEdit[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    Promise.all([fetch("/api/suggested-edits").then((r) => r.json())])
      .then(([editsJson]) => {
        console.log(editsJson);
        setEdits(editsJson.data ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const handleEditAction = async (id: string, action: "approve" | "reject") => {
    await fetch(`/api/suggested-edits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    refresh();
    if (action === "approve") onEditApplied();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050817]/75 backdrop-blur-sm px-4">
      <div className="lineage-modal flex h-[82vh] w-full max-w-2xl flex-col">
        <div className="flex items-center justify-between border-b border-[#202944] px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-white">
            Requests
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-[#8993ad] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2 border-b border-[#202944] px-5 pt-3">
          <button
            onClick={() => setTab("edits")}
            className={`lineage-tab rounded-t-lg px-3 py-2 text-sm ${
              tab === "edits"
                ? "border-b-2 border-[#8d68ff] font-medium text-white"
                : "text-[#8993ad]"
            }`}
          >
            Suggested edits{" "}
            {edits.length > 0 && (
              <span className="ml-1 rounded-full bg-[#8d68ff]/15 px-1.5 py-0.5 text-xs text-[#b9a8ff]">
                {edits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("messages")}
            className={`lineage-tab rounded-t-lg px-3 py-2 text-sm ${
              tab === "messages"
                ? "border-b-2 border-[#8d68ff] font-medium text-white"
                : "text-[#8993ad]"
            }`}
          >
            Contact messages
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-sm text-[#8993ad]">Loading…</p>}

          {!loading && tab === "edits" && edits.length === 0 && (
            <p className="text-sm text-[#8993ad]">No pending suggestions.</p>
          )}
          {!loading &&
            tab === "edits" &&
            edits.map((edit) => (
              <div key={edit._id} className="lineage-item mb-3 rounded-xl p-4">
                <p className="mb-1 text-xs text-[#8993ad]">
                  For person <span className="font-mono">{edit.personId}</span>{" "}
                  · {new Date(edit.createdAt).toLocaleString()}
                </p>
                {edit.submittedByName && (
                  <p className="mb-2 text-xs text-[#8993ad]">
                    Submitted by {edit.submittedByName}
                    {edit.submittedByEmail ? ` (${edit.submittedByEmail})` : ""}
                  </p>
                )}
                <ul className="mb-2 space-y-1 text-sm">
                  {Object.entries(edit.changes ?? {}).map(([field, value]) => (
                    <li key={field}>
                      <span className="font-medium text-white">{field}:</span>{" "}
                      <span className="text-[#a98cff]">{String(value)}</span>
                    </li>
                  ))}
                </ul>
                {edit.note && (
                  <p className="mb-3 text-sm italic text-[#aeb7cf]">
                    "{edit.note}"
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditAction(edit._id, "approve")}
                    className="lineage-primary-action px-3 py-1.5 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleEditAction(edit._id, "reject")}
                    className="lineage-danger-action px-3 py-1.5 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}

          {/* {!loading && tab === "messages" && messages.length === 0 && (
            <p className="text-sm text-[#8993ad]">No messages yet.</p>
          )}
          {!loading &&
            tab === "messages" &&
            messages.map((m) => (
              <div
                key={m._id}
                className="lineage-item mb-3 rounded-xl p-4"
              >
                <p className="text-sm font-medium text-white">
                  {m.name}{" "}
                  <span className="font-normal text-[#8993ad]">
                    ({m.email})
                  </span>
                </p>
                <p className="mt-1 text-sm text-[#aeb7cf]">{m.message}</p>
                <p className="mt-2 text-xs text-[#8993ad]">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </div>
            ))} */}
        </div>
      </div>
    </div>
  );
}
