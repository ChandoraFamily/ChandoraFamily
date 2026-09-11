"use client";

import { useEffect, useState } from "react";
import PersonSearch from "@/components/PersonSearch";
import FamilyTree from "@/components/FamilyTree";
import PersonDetailPanel from "@/components/PersonDetailPanel";
import PersonForm from "@/components/PersonForm";
import type { Person } from "@/types/person";
import { useAuth } from "@/lib/auth-context";
import AdminInbox from "@/components/AdminInbox";
import ContactForm from "@/components/ContactForm";
import RelationshipFinder from "@/components/RelationshipFinder";
import ProfileSettings from "@/components/ProfileSettings";

function getUserName(user: unknown) {
  if (!user || typeof user !== "object") return "";
  const value = (user as Record<string, unknown>).name;
  return typeof value === "string" ? value.trim() : "";
}

function getUserProfilePicture(user: unknown) {
  if (!user || typeof user !== "object") return "";
  const data = user as Record<string, unknown>;
  const value =
    data.profilePicture ??
    data.profileImage ??
    data.avatar ??
    data.photoURL ??
    data.image ??
    data.picture;
  return typeof value === "string" ? value : "";
}

function getUserEmail(user: unknown) {
  if (!user || typeof user !== "object") return "";
  const value = (user as Record<string, unknown>).email;
  return typeof value === "string" ? value.trim() : "";
}

function getUserInitials(user: unknown) {
  const name = getUserName(user);
  const initials = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();
  if (initials) return initials;

  if (user && typeof user === "object") {
    const email = (user as Record<string, unknown>).email;
    if (typeof email === "string") {
      const emailInitials = email
        .split("@")[0]
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 2)
        .toUpperCase();
      if (emailInitials) return emailInitials;
    }
  }

  return "U";
}

export default function HomePage() {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isLoggedIn, login, logout, isAdmin, register, user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showRelationshipFinder, setShowRelationshipFinder] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "editor" as "editor" | "admin",
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  const userName = getUserName(user);
  const userProfilePicture = getUserProfilePicture(user);
  const userInitials = getUserInitials(user);
  const userEmail = getUserEmail(user);

  // Default to the first person in the store so there's always a tree on load.
  useEffect(() => {
    if (focusId) return;
    fetch("/api/persons?limit=1")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load a default person.");
        return res.json();
      })
      .then((json) => {
        const people: Person[] = json.data ?? [];
        if (people.length) setFocusId(people[0].id);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [focusId, refreshKey]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const err = await login(loginForm.email, loginForm.password);
    if (err) setLoginError(err);
    else {
      setShowLogin(false);
      setLoginForm({ email: "", password: "" });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    const err = await register(
      registerForm.email,
      registerForm.password,
      registerForm.name,
      registerForm.role,
    );
    if (err) setRegisterError(err);
    else {
      setRegisterSuccess(true);
      setRegisterForm({ email: "", password: "", name: "", role: "editor" });
    }
  };

  return (
    <main className="lineage-app flex h-screen flex-col">
      <header className="lineage-header flex min-h-[76px] items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 lg:px-7">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <div
            className="lineage-logo-mark h-11 w-11 shrink-0 rounded-full border-0 border-[#8a5cff] shadow-[0_0_20px_rgba(125,92,255,.12)]"
            role="img"
            aria-label="Logo"
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className="lineage-logo-text h-11 w-28 shrink-0 rounded-lg shadow-[0_0_20px_rgba(125,92,255,.12)]"
            role="img"
            aria-label="LogoText"
            onContextMenu={(e) => e.preventDefault}
          />
        </div>

        {/* Desktop search */}
        <div className="lineage-desktop-search lineage-search mx-4 hidden min-w-0 flex-1 lg:block lg:max-w-[560px]">
          <PersonSearch
            onSelectPerson={(id) => {
              setFocusId(id);
              setSelectedId(id);
            }}
          />
        </div>

        {/* Desktop actions */}
        <div className="lineage-desktop-actions hidden shrink-0 items-center gap-3 lg:flex">
          {!isLoggedIn && (
            <button
              onClick={() => setShowContact(true)}
              className="lineage-header-button whitespace-nowrap"
            >
              Contact Us
            </button>
          )}
          <button
            onClick={() => setShowRelationshipFinder(true)}
            className="lineage-header-button lineage-primary-button whitespace-nowrap"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 12a3 3 0 0 0 4.2.2l2.4-2.4a3 3 0 0 0-4.2-4.2l-1.1 1.1M15 12a3 3 0 0 0-4.2-.2l-2.4 2.4a3 3 0 0 0 4.2 4.2l1.1-1.1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Find Relationship
          </button>
          {isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="lineage-avatar grid place-items-center overflow-hidden"
                title={userName || "User profile"}
                aria-label={userName || "User profile"}
                aria-expanded={profileMenuOpen}
              >
                {userProfilePicture ? (
                  <img
                    src={userProfilePicture}
                    alt={userName || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  userInitials
                )}
              </button>
              {profileMenuOpen && (
                <div
                  className="lineage-account-dropdown"
                  role="menu"
                  aria-label="Account menu"
                >
                  <div className="lineage-account-header">
                    <div className="lineage-account-avatar">
                      {userProfilePicture ? (
                        <img
                          src={userProfilePicture}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        userInitials
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {userName || "User"}
                      </p>
                      <p className="truncate text-xs text-[#8993ad]">
                        {userEmail}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-[#8d68ff]">
                        {isAdmin ? "Administrator" : "Editor"}
                      </p>
                    </div>
                  </div>

                  <div className="lineage-account-divider" />

                  <div className="lineage-account-section">
                    <button
                      className="lineage-account-item"
                      onClick={() => {
                        setShowNewPersonForm(true);
                        setProfileMenuOpen(false);
                      }}
                    >
                      <span className="lineage-account-icon">＋</span>
                      <span>Add Person</span>
                    </button>
                    {isAdmin && (
                      <button
                        className="lineage-account-item"
                        onClick={() => {
                          setShowInbox(true);
                          setProfileMenuOpen(false);
                        }}
                      >
                        <span className="lineage-account-icon">▣</span>
                        <span>Admin Inbox</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        className="lineage-account-item"
                        onClick={() => {
                          setShowRegister(true);
                          setRegisterSuccess(false);
                          setProfileMenuOpen(false);
                        }}
                      >
                        <span className="lineage-account-icon">＋</span>
                        <span>Add Login Account</span>
                      </button>
                    )}
                  </div>

                  <div className="lineage-account-divider" />
                  <button
                    className="lineage-account-item"
                    onClick={() => {
                      setShowProfileSettings(true);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span className="lineage-account-icon">⚙</span>
                    <span>Edit Profile</span>
                  </button>

                  <button
                    className="lineage-account-item lineage-account-danger"
                    onClick={() => {
                      logout();
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span className="lineage-account-icon">↪</span>
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="lineage-header-button whitespace-nowrap"
            >
              Log in
            </button>
          )}
        </div>

        {/* Mobile account button: the same account dropdown is available on small screens. */}
        {isLoggedIn && (
          <div className="lineage-mobile-profile relative ml-auto lg:hidden">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="lineage-avatar grid place-items-center overflow-hidden"
              title={userName || "User profile"}
              aria-label={userName || "User profile"}
              aria-expanded={profileMenuOpen}
            >
              {userProfilePicture ? (
                <img
                  src={userProfilePicture}
                  alt={userName || "Profile"}
                  className="h-full w-full object-cover"
                />
              ) : (
                userInitials
              )}
            </button>
            {profileMenuOpen && (
              <div
                className="lineage-account-dropdown lineage-account-dropdown-mobile"
                role="menu"
                aria-label="Account menu"
              >
                <div className="lineage-account-header">
                  <div className="lineage-account-avatar">
                    {userProfilePicture ? (
                      <img
                        src={userProfilePicture}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {userName || "User"}
                    </p>
                    <p className="truncate text-xs text-[#8993ad]">
                      {userEmail}
                    </p>
                  </div>
                </div>
                <div className="lineage-account-divider" />
                <button
                  className="lineage-account-item"
                  onClick={() => {
                    setShowNewPersonForm(true);
                    setProfileMenuOpen(false);
                  }}
                >
                  <span className="lineage-account-icon">＋</span>
                  <span>Add Person</span>
                </button>
                {isAdmin && (
                  <button
                    className="lineage-account-item"
                    onClick={() => {
                      setShowInbox(true);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span className="lineage-account-icon">▣</span>
                    <span>Admin Inbox</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="lineage-account-item"
                    onClick={() => {
                      setShowRegister(true);
                      setRegisterSuccess(false);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span className="lineage-account-icon">＋</span>
                    <span>Add Login Account</span>
                  </button>
                )}
                <div className="lineage-account-divider" />
                <button
                  className="lineage-account-item"
                  onClick={() => {
                    setShowProfileSettings(true);
                    setProfileMenuOpen(false);
                  }}
                >
                  <span className="lineage-account-icon">⚙</span>
                  <span>Edit Profile</span>
                </button>
                <button
                  className="lineage-account-item lineage-account-danger"
                  onClick={() => {
                    logout();
                    setProfileMenuOpen(false);
                  }}
                >
                  <span className="lineage-account-icon">↪</span>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="lineage-mobile-trigger lg:hidden"
        >
          {menuOpen ? "×" : "☰"}
        </button>

        {/* Mobile navigation */}
        {menuOpen && (
          <div className="lineage-mobile-menu absolute left-0 right-0 top-full z-40 border-b px-4 py-4 shadow-[0_14px_30px_rgba(0,0,0,.28)] sm:px-6 lg:hidden">
            <div className="lineage-mobile-search mb-3">
              <PersonSearch
                onSelectPerson={(id) => {
                  setFocusId(id);
                  setSelectedId(id);
                  setMenuOpen(false);
                }}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => {
                  setShowContact(true);
                  setMenuOpen(false);
                }}
                className="lineage-menu-button"
              >
                Contact Us
              </button>
              <button
                onClick={() => {
                  setShowRelationshipFinder(true);
                  setMenuOpen(false);
                }}
                className="lineage-menu-button lineage-primary-button"
              >
                Find Relationship
              </button>
              {!isLoggedIn && (
                <button
                  onClick={() => {
                    setShowLogin(true);
                    setMenuOpen(false);
                  }}
                  className="lineage-menu-button"
                >
                  Log in
                </button>
              )}
              {isLoggedIn && (
                <p className="px-2 py-2 text-xs text-[#8993ad]">
                  Account actions are available from your profile picture.
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          {focusId ? (
            <FamilyTree
              key={`${focusId}-${refreshKey}`}
              focusId={focusId}
              isAdmin={isAdmin}
              onSelectPerson={(id) => setSelectedId(id)}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="max-w-sm text-ink-faint">
                No one in the tree yet. Add the first person to start building
                it.
              </p>
            </div>
          )}
        </div>

        {selectedId && (
          <PersonDetailPanel
            personId={selectedId}
            onClose={() => setSelectedId(null)}
            onChanged={() => setRefreshKey((k) => k + 1)}
            onNavigate={(id) => {
              setFocusId(id);
              setSelectedId(id);
            }}
          />
        )}
      </div>

      {showNewPersonForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050817]/75 px-4">
          <div className="w-full max-w-md rounded-card border border-ink/15 bg-[#10162d] p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              Add a person
            </h2>
            <PersonForm
              onCancel={() => setShowNewPersonForm(false)}
              onSaved={(person) => {
                setShowNewPersonForm(false);
                setFocusId(person.id);
                setSelectedId(person.id);
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
        </div>
      )}
      {showLogin && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050817]/75 px-4">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-xs rounded-card border border-ink/15 bg-[#10162d] p-5"
          >
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">
              Log in
            </h2>
            <input
              type="email"
              required
              autoFocus
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, email: e.target.value }))
              }
              className="mb-2 w-full rounded-card border border-ink/25 bg-parchment-light px-3 py-2 text-sm text-ink"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, password: e.target.value }))
              }
              className="mb-3 w-full rounded-card border border-ink/25 bg-parchment-light px-3 py-2 text-sm text-ink"
            />
            {loginError && (
              <p className="mb-2 text-sm text-rose">{loginError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-card bg-ink px-4 py-2 text-sm text-parchment-light hover:bg-ink-soft"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="rounded-card border border-ink/25 px-4 py-2 text-sm text-ink hover:bg-parchment-dark"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {showRegister && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050817]/75 px-4">
          <div className="w-full max-w-sm rounded-card border border-ink/15 bg-[#10162d] p-5">
            <h2 className="mb-3 font-display text-lg font-semibold text-ink">
              Create a login
            </h2>
            {registerSuccess ? (
              <div className="space-y-3">
                <p className="text-sm text-lineage">Login created.</p>
                <button
                  onClick={() => setShowRegister(false)}
                  className="rounded-card border border-ink/25 px-4 py-2 text-sm text-ink hover:bg-parchment-dark"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-2">
                <input
                  required
                  placeholder="Full name"
                  value={registerForm.name}
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full rounded-card border border-ink/25 bg-parchment-light px-3 py-2 text-sm text-ink"
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full rounded-card border border-ink/25 bg-parchment-light px-3 py-2 text-sm text-ink"
                />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className="w-full rounded-card border border-ink/25 bg-parchment-light px-3 py-2 text-sm text-ink"
                />
                <select
                  value={registerForm.role}
                  onChange={(e) =>
                    setRegisterForm((f) => ({
                      ...f,
                      role: e.target.value as "editor" | "admin",
                    }))
                  }
                  className="w-full rounded-card border border-ink/25 bg-parchment-light px-3 py-2 text-sm text-ink"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                {registerError && (
                  <p className="text-sm text-rose">{registerError}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="rounded-card bg-ink px-4 py-2 text-sm text-parchment-light hover:bg-ink-soft"
                  >
                    Create login
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                    className="rounded-card border border-ink/25 px-4 py-2 text-sm text-ink hover:bg-parchment-dark"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showContact && <ContactForm onClose={() => setShowContact(false)} />}

      {showRelationshipFinder && (
        <RelationshipFinder onClose={() => setShowRelationshipFinder(false)} />
      )}

      {showProfileSettings && (
        <ProfileSettings onClose={() => setShowProfileSettings(false)} />
      )}

      {showInbox && (
        <AdminInbox
          onClose={() => setShowInbox(false)}
          onEditApplied={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </main>
  );
}
