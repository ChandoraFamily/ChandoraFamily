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
  const [showRelationshipFinder, setShowRelationshipFinder] = useState(false);

  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "editor" as "editor" | "admin",
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

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
      <header className="lineage-header flex flex-wrap items-center justify-between gap-3 border-b border-ink/15 bg-parchment-light px-6 py-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Lineage
          </h1>
          <p className="text-xs text-ink-faint">
            Search a name to jump to their branch of the tree.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PersonSearch
            onSelectPerson={(id) => {
              setFocusId(id);
              setSelectedId(id);
            }}
          />
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            className="rounded-card border border-ink/25 px-3 py-2.5 text-sm text-ink sm:hidden"
          >
            ☰
          </button>
          <button
            onClick={() => setShowContact(true)}
            className="whitespace-nowrap rounded-card border border-ink/25 px-4 py-2.5 text-sm text-ink hover:bg-parchment-dark"
          >
            Contact Us
          </button>
          <button
            onClick={() => setShowRelationshipFinder(true)}
            className="whitespace-nowrap rounded-card border border-ink/25 px-4 py-2.5 text-sm text-ink hover:bg-parchment-dark"
          >
            Find Relationship
          </button>
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <button
                  onClick={() => setShowInbox(true)}
                  className="whitespace-nowrap rounded-card border border-brass/50 px-4 py-2.5 text-sm text-brass hover:bg-brass/10"
                >
                  Requests
                </button>
              )}
              <button
                onClick={() => setShowNewPersonForm(true)}
                className="whitespace-nowrap rounded-card bg-ink px-4 py-2.5 text-sm font-medium text-parchment-light hover:bg-ink-soft"
              >
                + New person
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowRegister(true);
                    setRegisterSuccess(false);
                  }}
                  className="whitespace-nowrap rounded-card border border-ink/25 px-4 py-2.5 text-sm text-ink hover:bg-parchment-dark"
                >
                  + New login
                </button>
              )}
              <button
                onClick={logout}
                className="whitespace-nowrap rounded-card border border-ink/25 px-4 py-2.5 text-sm text-ink hover:bg-parchment-dark"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="whitespace-nowrap rounded-card border border-ink/25 px-4 py-2.5 text-sm text-ink hover:bg-parchment-dark"
            >
              Log in
            </button>
          )}
        </div>
        {menuOpen && (
          <div className="flex w-full flex-col gap-2 border-t border-ink/10 px-6 py-3 sm:hidden">
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => setShowInbox(true)}
                    className="whitespace-nowrap rounded-card border border-brass/50 px-4 py-2.5 text-sm text-brass hover:bg-brass/10"
                  >
                    Requests
                  </button>
                )}
                <button
                  onClick={() => setShowNewPersonForm(true)}
                  className="whitespace-nowrap rounded-card bg-ink px-4 py-2.5 text-sm font-medium text-parchment-light hover:bg-ink-soft"
                >
                  + New person
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowRegister(true);
                      setRegisterSuccess(false);
                    }}
                    className="whitespace-nowrap rounded-card border border-ink/25 px-4 py-2.5 text-sm text-ink hover:bg-parchment-dark"
                  >
                    + New login
                  </button>
                )}
                <button
                  onClick={logout}
                  className="whitespace-nowrap rounded-card border border-ink/25 px-4 py-2.5 text-sm text-ink hover:bg-parchment-dark"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="whitespace-nowrap rounded-card border border-ink/25 px-4 py-2.5 text-sm text-ink hover:bg-parchment-dark"
              >
                Log in
              </button>
            )}
          </div>
        )}
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1">
          {focusId ? (
            <FamilyTree
              key={`${focusId}-${refreshKey}`}
              focusId={focusId}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-md rounded-card border border-ink/15 bg-parchment-light p-5">
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-xs rounded-card border border-ink/15 bg-parchment-light p-5"
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-card border border-ink/15 bg-parchment-light p-5">
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

      {showInbox && (
        <AdminInbox
          onClose={() => setShowInbox(false)}
          onEditApplied={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </main>
  );
}
