"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

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

async function fetchJsonSafe<T>(
  url: string,
  options?: RequestInit,
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("lineage_token")
        : null;
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };
    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
    const contentType = res.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return {
        ok: false,
        status: res.status,
        error:
          res.status === 401
            ? "Unauthorized. Please sign in as an admin."
            : `Server returned an unexpected response (HTTP ${res.status}).`,
      };
    }

    const json = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: json.error || `Request failed with status ${res.status}`,
      };
    }

    return { ok: true, status: res.status, data: json.data ?? (json as any) };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || "Network error while connecting to server.",
    };
  }
}

export default function AdminInbox({
  onClose,
  onEditApplied,
}: AdminInboxProps) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<"messages" | "edits">("edits");
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [edits, setEdits] = useState<SuggestedEdit[]>([]);
  const [personsMap, setPersonsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingEditId, setProcessingEditId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<"approve" | "reject" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [messageFilter, setMessageFilter] = useState<"all" | "new" | "read">("all");
  const [editFilter, setEditFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const refresh = async () => {
    setLoading(true);
    setFetchError(null);

    const [editsRes, contactRes, personsRes] = await Promise.all([
      fetchJsonSafe<SuggestedEdit[]>("/api/suggested-edits"),
      fetchJsonSafe<ContactMessage[]>("/api/contact"),
      fetchJsonSafe<{ id?: string; _id?: string; firstName: string; lastName?: string }[]>("/api/persons"),
    ]);

    if (editsRes.ok && Array.isArray(editsRes.data)) {
      setEdits(editsRes.data);
    }
    if (contactRes.ok && Array.isArray(contactRes.data)) {
      setMessages(contactRes.data);
    }
    if (personsRes.ok && Array.isArray(personsRes.data)) {
      const map: Record<string, string> = {};
      for (const p of personsRes.data) {
        const id = p.id || p._id;
        if (id) {
          map[String(id)] = [p.firstName, p.lastName].filter(Boolean).join(" ");
        }
      }
      setPersonsMap(map);
    }

    if (!editsRes.ok && !contactRes.ok) {
      setFetchError(
        editsRes.error || contactRes.error || "Failed to load admin inbox data.",
      );
    } else if (!editsRes.ok) {
      setFetchError(`Suggested edits: ${editsRes.error}`);
    } else if (!contactRes.ok) {
      setFetchError(`Contact messages: ${contactRes.error}`);
    }

    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleEditAction = async (id: string, action: "approve" | "reject") => {
    setActionError(null);
    setProcessingEditId(id);
    setProcessingAction(action);

    const res = await fetchJsonSafe(`/api/suggested-edits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setProcessingEditId(null);
    setProcessingAction(null);

    if (res.ok) {
      const newStatus = action === "approve" ? "approved" : "rejected";
      setEdits((prev) =>
        prev.map((e) => (e._id === id ? { ...e, status: newStatus } : e))
      );
      if (action === "approve") onEditApplied();
    } else {
      setActionError(res.error || `Failed to ${action} edit.`);
      refresh();
    }
  };

  const handleToggleMessageStatus = async (
    id: string,
    currentStatus: "new" | "read",
  ) => {
    setActionError(null);
    const nextStatus = currentStatus === "new" ? "read" : "new";
    const res = await fetchJsonSafe(`/api/contact/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, status: nextStatus } : m)),
      );
    } else {
      setActionError(res.error || "Failed to update message status.");
    }
  };

  const executeDeleteMessage = async (id: string) => {
    setDeletingId(id);
    setActionError(null);

    const res = await fetchJsonSafe(`/api/contact/${id}`, {
      method: "DELETE",
    });

    setDeletingId(null);
    setConfirmDeleteId(null);

    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } else {
      setActionError(res.error || "Failed to delete message.");
    }
  };

  const newMessagesCount = messages.filter((m) => m.status === "new").length;
  const filteredMessages = messages.filter((m) => {
    if (messageFilter === "new") return m.status === "new";
    if (messageFilter === "read") return m.status === "read";
    return true;
  });

  const pendingEditsCount = edits.filter((e) => e.status === "pending").length;
  const approvedEditsCount = edits.filter((e) => e.status === "approved").length;
  const rejectedEditsCount = edits.filter((e) => e.status === "rejected").length;

  const filteredEdits = edits.filter((e) => {
    if (editFilter === "pending") return e.status === "pending";
    if (editFilter === "approved") return e.status === "approved";
    if (editFilter === "rejected") return e.status === "rejected";
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050817]/75 backdrop-blur-sm px-4">
      <div className="lineage-modal flex h-[82vh] w-full max-w-2xl flex-col">
        <div className="flex items-center justify-between border-b border-[#202944] px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-white">
            Requests & Inquiries
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-[#8993ad] hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-[#202944] px-5 pt-3">
          <div className="flex gap-2">
            <button
              onClick={() => setTab("edits")}
              className={`lineage-tab flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm transition ${
                tab === "edits"
                  ? "border-b-2 border-[#8d68ff] font-medium text-white"
                  : "text-[#8993ad] hover:text-white"
              }`}
            >
              <span>Suggested edits</span>
              {edits.length > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    pendingEditsCount > 0
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-[#202944] text-[#8993ad]"
                  }`}
                >
                  {pendingEditsCount > 0
                    ? `${pendingEditsCount} pending`
                    : `${edits.length} total`}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("messages")}
              className={`lineage-tab flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm transition ${
                tab === "messages"
                  ? "border-b-2 border-[#8d68ff] font-medium text-white"
                  : "text-[#8993ad] hover:text-white"
              }`}
            >
              <span>Contact messages</span>
              {messages.length > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    newMessagesCount > 0
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-[#202944] text-[#8993ad]"
                  }`}
                >
                  {newMessagesCount > 0 ? `${newMessagesCount} new` : messages.length}
                </span>
              )}
            </button>
          </div>

          {tab === "edits" && edits.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#8993ad]">
              <span>Filter:</span>
              <button
                type="button"
                onClick={() => setEditFilter("pending")}
                className={`rounded px-1.5 py-0.5 transition ${
                  editFilter === "pending"
                    ? "bg-amber-500/20 text-amber-300 font-medium"
                    : "hover:text-white"
                }`}
              >
                Pending ({pendingEditsCount})
              </button>
              <button
                type="button"
                onClick={() => setEditFilter("approved")}
                className={`rounded px-1.5 py-0.5 transition ${
                  editFilter === "approved"
                    ? "bg-emerald-500/20 text-emerald-300 font-medium"
                    : "hover:text-white"
                }`}
              >
                Approved ({approvedEditsCount})
              </button>
              <button
                type="button"
                onClick={() => setEditFilter("rejected")}
                className={`rounded px-1.5 py-0.5 transition ${
                  editFilter === "rejected"
                    ? "bg-rose-500/20 text-rose-300 font-medium"
                    : "hover:text-white"
                }`}
              >
                Rejected ({rejectedEditsCount})
              </button>
              <button
                type="button"
                onClick={() => setEditFilter("all")}
                className={`rounded px-1.5 py-0.5 transition ${
                  editFilter === "all"
                    ? "bg-[#8d68ff]/20 text-[#cfc2ff] font-medium"
                    : "hover:text-white"
                }`}
              >
                All ({edits.length})
              </button>
            </div>
          )}

          {tab === "messages" && messages.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#8993ad]">
              <span>Filter:</span>
              <button
                type="button"
                onClick={() => setMessageFilter("all")}
                className={`rounded px-1.5 py-0.5 ${
                  messageFilter === "all"
                    ? "bg-[#8d68ff]/20 text-[#cfc2ff] font-medium"
                    : "hover:text-white"
                }`}
              >
                All ({messages.length})
              </button>
              <button
                type="button"
                onClick={() => setMessageFilter("new")}
                className={`rounded px-1.5 py-0.5 ${
                  messageFilter === "new"
                    ? "bg-amber-500/20 text-amber-300 font-medium"
                    : "hover:text-white"
                }`}
              >
                New ({newMessagesCount})
              </button>
              <button
                type="button"
                onClick={() => setMessageFilter("read")}
                className={`rounded px-1.5 py-0.5 ${
                  messageFilter === "read"
                    ? "bg-[#252f4c] text-white font-medium"
                    : "hover:text-white"
                }`}
              >
                Read ({messages.length - newMessagesCount})
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {fetchError && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">⚠</span>
                <span>{fetchError}</span>
              </div>
              <button
                type="button"
                onClick={refresh}
                className="ml-3 rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/30 transition"
              >
                Retry
              </button>
            </div>
          )}

          {actionError && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-rose-400">⚠</span>
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="ml-3 rounded-md bg-rose-500/20 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/30 transition"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading && <p className="text-sm text-[#8993ad]">Loading…</p>}

          {!loading && tab === "edits" && filteredEdits.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-[#8993ad]">
                {edits.length === 0
                  ? "No suggested edits submitted yet."
                  : editFilter === "pending"
                  ? "No pending suggestions to review."
                  : editFilter === "approved"
                  ? "No approved suggestions yet."
                  : editFilter === "rejected"
                  ? "No rejected suggestions."
                  : "No suggestions match this filter."}
              </p>
              {editFilter === "pending" && edits.length > 0 && (
                <p className="mt-2 text-xs text-[#717b99]">
                  {edits.length} past suggestion{edits.length === 1 ? "" : "s"} can be viewed by clicking &ldquo;Approved&rdquo;, &ldquo;Rejected&rdquo;, or &ldquo;All&rdquo;.
                </p>
              )}
            </div>
          )}
          {!loading &&
            tab === "edits" &&
            filteredEdits.map((edit) => {
              const targetName = personsMap[edit.personId];
              return (
                <div key={edit._id} className="lineage-item mb-3 rounded-xl p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-[#8993ad]">
                        For person:{" "}
                        <span className="font-semibold text-white">
                          {targetName || "Person"}
                        </span>
                        <span className="ml-1 font-mono text-[10px] text-[#717b99]">
                          ({edit.personId})
                        </span>
                      </p>
                      <p className="text-[11px] text-[#717b99]">
                        Submitted {new Date(edit.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      {edit.status === "pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Pending review
                        </span>
                      )}
                      {edit.status === "approved" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          ✓ Approved
                        </span>
                      )}
                      {edit.status === "rejected" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                          ✕ Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {edit.submittedByName && (
                    <p className="mb-2 text-xs text-[#8993ad]">
                      Submitted by <strong className="text-white font-medium">{edit.submittedByName}</strong>
                      {edit.submittedByEmail ? ` (${edit.submittedByEmail})` : ""}
                    </p>
                  )}

                  <div className="mb-2 rounded-lg bg-[#0d132a]/60 border border-[#202944] p-2.5">
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-[#717b99] font-medium">Proposed Changes</p>
                    <ul className="space-y-1 text-sm">
                      {Object.entries(edit.changes ?? {}).map(([field, value]) => (
                        <li key={field} className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-[#aeb7cf]">{field}:</span>{" "}
                          <span className="font-medium text-[#a98cff]">{String(value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {edit.note && (
                    <p className="mb-3 text-sm italic text-[#aeb7cf]">
                      &ldquo;{edit.note}&rdquo;
                    </p>
                  )}

                  {edit.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditAction(edit._id, "approve")}
                        disabled={processingEditId === edit._id}
                        className="lineage-primary-action px-3.5 py-1.5 text-sm disabled:opacity-50 transition"
                      >
                        {processingEditId === edit._id && processingAction === "approve"
                          ? "Approving…"
                          : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditAction(edit._id, "reject")}
                        disabled={processingEditId === edit._id}
                        className="lineage-danger-action px-3.5 py-1.5 text-sm disabled:opacity-50 transition"
                      >
                        {processingEditId === edit._id && processingAction === "reject"
                          ? "Rejecting…"
                          : "Reject"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between border-t border-[#202944] pt-2 text-xs text-[#8993ad]">
                      <span>
                        Status:{" "}
                        <strong className={edit.status === "approved" ? "text-emerald-400" : "text-rose-400"}>
                          {edit.status.charAt(0).toUpperCase() + edit.status.slice(1)}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEditAction(edit._id, edit.status === "approved" ? "reject" : "approve")}
                        disabled={processingEditId === edit._id}
                        className="text-xs text-[#a98cff] hover:text-white transition disabled:opacity-50"
                      >
                        {processingEditId === edit._id
                          ? "Updating…"
                          : edit.status === "approved"
                          ? "Change to Rejected"
                          : "Change to Approved"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          {!loading && tab === "messages" && filteredMessages.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-[#8993ad]">
                {messages.length === 0
                  ? "No contact messages received yet."
                  : "No messages match this filter."}
              </p>
            </div>
          )}

          {!loading &&
            tab === "messages" &&
            filteredMessages.map((m) => (
              <div
                key={m._id}
                className={`lineage-item mb-3 rounded-xl p-4 border transition ${
                  m.status === "new"
                    ? "border-amber-500/30 bg-[#121833]"
                    : "border-[#202944] bg-[#0e1329]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#202944]/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{m.name}</span>
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(
                        "Regarding your Chandora Family Tree inquiry",
                      )}`}
                      className="text-xs text-[#8d68ff] hover:underline"
                    >
                      {m.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        m.status === "new"
                          ? "border border-amber-500/40 bg-amber-500/10 text-amber-300"
                          : "border border-slate-700 bg-slate-800/60 text-slate-400"
                      }`}
                    >
                      {m.status === "new" ? "New" : "Read"}
                    </span>
                    <span className="text-xs text-[#8993ad]">
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="whitespace-pre-wrap text-sm text-[#c8d1e8] leading-relaxed">
                    {m.message}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#202944]/70 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleMessageStatus(m._id, m.status)
                      }
                      className="lineage-secondary-action px-2.5 py-1 text-xs"
                    >
                      {m.status === "new" ? "Mark as Read" : "Mark as New"}
                    </button>
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(
                        "Regarding your Chandora Family Tree inquiry",
                      )}`}
                      className="lineage-primary-action inline-flex items-center gap-1 px-3 py-1 text-xs"
                    >
                      <span>✉</span>
                      <span>Reply via Email</span>
                    </a>
                  </div>

                  {confirmDeleteId === m._id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-300 font-medium">
                        Delete?
                      </span>
                      <button
                        type="button"
                        onClick={() => executeDeleteMessage(m._id)}
                        disabled={deletingId === m._id}
                        className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition shadow-sm"
                      >
                        {deletingId === m._id ? "Deleting…" : "Yes, Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deletingId === m._id}
                        className="rounded-lg border border-[#2c3757] bg-[#1a2238] px-2.5 py-1 text-xs text-[#aeb7cf] hover:text-white transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setConfirmDeleteId(m._id);
                      }}
                      disabled={deletingId === m._id}
                      className="lineage-danger-action px-2.5 py-1 text-xs"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
