"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function ProfileSettings({ onClose }: { onClose: () => void }) {
  const { user, refresh } = useAuth(); // see auth-context note below
  const [name, setName] = useState((user as any)?.name ?? "");
  const [preview, setPreview] = useState<string | null>(
    (user as any)?.profilePicture ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, profilePicture: preview }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setProfileError(json.error ?? "Failed to save.");
      return;
    }
    setProfileSaved(true);
    refresh?.();
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      setPwError(json.error ?? "Failed to change password.");
      return;
    }
    setPwSaved(true);
    setCurrentPassword("");
    setNewPassword("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050817]/75 px-4 backdrop-blur-sm">
      <div className="lineage-modal w-full max-w-sm space-y-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-white">
            Edit profile
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none text-[#8993ad] hover:text-white"
          >
            ×
          </button>
        </div>

        <form onSubmit={saveProfile} className="lineage-form space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#8a5cff] bg-[#111733]">
              {preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
              className="text-xs text-[#8993ad]"
            />
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="lineage-input"
          />
          {profileError && (
            <p className="text-sm text-red-400">{profileError}</p>
          )}
          {profileSaved && <p className="text-sm text-lineage">Saved.</p>}
          <button
            type="submit"
            disabled={saving}
            className="lineage-primary-button w-full py-2"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>

        <div className="border-t border-[#293452] pt-4">
          <form onSubmit={savePassword} className="lineage-form space-y-3">
            <input
              type="password"
              required
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="lineage-input"
            />
            <input
              type="password"
              required
              placeholder="New password (8+ characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="lineage-input"
            />
            {pwError && <p className="text-sm text-red-400">{pwError}</p>}
            {pwSaved && (
              <p className="text-sm text-lineage">Password changed.</p>
            )}
            <button type="submit" className="lineage-header-button w-full py-2">
              Change password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
