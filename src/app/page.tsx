"use client";

import { useCallback, useEffect, useState } from "react";
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
import TreeLoadingSplash from "@/components/TreeLoadingSplash";
import { stopAllSplashAudio } from "@/lib/splash-audio";
import HindiTranslateModal from "@/components/HindiTranslateModal";
import { useLanguage } from "@/lib/language-context";
import { useTheme, THEMES } from "@/lib/theme-context";

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
  const { lang, setLang, t } = useLanguage();
  const { theme, setTheme, themeConfig } = useTheme();
  const [headerThemeOpen, setHeaderThemeOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewPersonForm, setShowNewPersonForm] = useState(false);
  const [showTranslateModal, setShowTranslateModal] = useState(false);
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
  const [isPageSplashComplete, setIsPageSplashComplete] = useState(false);
  const [isTreeReady, setIsTreeReady] = useState(false);
  const [pageSplashError, setPageSplashError] = useState<string | null>(null);
  const [adminPersonId, setAdminPersonId] = useState<string>(
    "6aa19ec9d59615212690b13e",
  );
  const [adminName, setAdminName] = useState<string>("Ajay Kumar");
  const [focusNotice, setFocusNotice] = useState<string | null>(null);

  const userName = getUserName(user);
  const userProfilePicture = getUserProfilePicture(user);
  const userInitials = getUserInitials(user);
  const userEmail = getUserEmail(user);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const personId = params.get("person")?.trim();

    if (personId) {
      setFocusId(personId);
      setSelectedId(personId);
      return;
    }

    if (focusId) return;
    fetch("/api/config/focus")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load focus configuration.");
        return res.json();
      })
      .then((json) => {
        const config = json.data;
        if (config?.adminPersonId) setAdminPersonId(config.adminPersonId);
        if (config?.adminPerson) {
          const p = config.adminPerson;
          const full = `${p.firstName} ${
            p.middleName ? p.middleName + " " : ""
          }${p.lastName || ""}`.trim();
          if (full) setAdminName(full);
        }
        const targetId = config?.focusId || config?.adminPersonId;
        if (targetId) {
          setFocusId(targetId);
        } else {
          return fetch("/api/persons?limit=1")
            .then((r) => r.json())
            .then((j) => {
              const people: Person[] = j.data ?? [];
              if (people.length) setFocusId(people[0].id);
              else setIsTreeReady(true);
            });
        }
      })
      .catch((err) => {
        console.warn(
          "Focus config fetch failed, falling back to persons list:",
          err,
        );
        fetch("/api/persons?limit=1")
          .then((r) => r.json())
          .then((j) => {
            const people: Person[] = j.data ?? [];
            if (people.length) setFocusId(people[0].id);
            else setIsTreeReady(true);
          })
          .catch(() => {
            setPageSplashError("Failed to initialize family tree.");
          });
      });
  }, [focusId, refreshKey]);

  const handleTreeLoaded = useCallback(() => {
    setIsTreeReady(true);
  }, []);

  const handleFocusAdmin = () => {
    const targetId = adminPersonId || "6aa19ec9d59615212690b13e";
    setFocusId(targetId);
    setSelectedId(targetId);
    setFocusNotice(`Tree focused on Admin (${adminName || "Ajay Kumar"})`);
    setTimeout(() => setFocusNotice(null), 3200);
  };

  const handleSetAsDefaultFocus = async (id: string) => {
    try {
      const res = await fetch("/api/config/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusId: id }),
      });
      if (res.ok) {
        setFocusNotice("Saved as default tree focus for all visitors.");
      } else {
        const err = await res.json();
        setFocusNotice(err.error || "Failed to set default focus.");
      }
    } catch {
      setFocusNotice("Failed to save default focus.");
    }
    setTimeout(() => setFocusNotice(null), 3500);
  };

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
    <main className="lineage-app relative flex h-full md:h-screen flex-col">
      {!isPageSplashComplete && (
        <TreeLoadingSplash
          isLoaded={isTreeReady}
          error={pageSplashError}
          onRetry={() => {
            setPageSplashError(null);
            setRefreshKey((k) => k + 1);
          }}
          onComplete={() => {
            stopAllSplashAudio();
            setIsPageSplashComplete(true);
          }}
        />
      )}
      {/* Semantic H1 and Crawler Summary for Chandora SEO & Accessibility */}
      <h1 className="sr-only">
        Chandora – Official Chandora Family Tree &amp; Lineage Archive |
        chandora.in
      </h1>

      <header
        className="lineage-header flex min-h-[76px] items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 lg:px-7 transition-colors duration-500"
        style={{
          backgroundColor: themeConfig.headerBg,
          borderColor: themeConfig.navBorder,
        }}
      >
        <div
          className="flex min-w-0 shrink-0 items-center gap-3 cursor-pointer select-none"
          onClick={() => setIsPageSplashComplete(false)}
          title="Play Heritage Chronicle & Lineage Splash"
        >
          <div
            className="lineage-logo-mark h-11 w-11 shrink-0 rounded-full border-0 border-[#8a5cff] shadow-[0_0_20px_rgba(125,92,255,.12)] transition-transform hover:scale-105 active:scale-95"
            role="img"
            aria-label="Logo"
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className="lineage-logo-text h-11 w-28 shrink-0 rounded-lg shadow-[0_0_20px_rgba(125,92,255,.12)] transition-opacity hover:opacity-90 active:scale-95"
            role="img"
            aria-label="LogoText"
            onContextMenu={(e) => e.preventDefault()}
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
          {/* Theme Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setHeaderThemeOpen((v) => !v)}
              className="lineage-header-button whitespace-nowrap flex items-center gap-2 hover:bg-white/10 transition"
              title="Change Color Theme"
            >
              <div
                className="h-3.5 w-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${themeConfig.primary}, ${themeConfig.accent})`,
                }}
              />
              <span className="text-xs font-medium">
                {lang === "hi" ? themeConfig.hindiLabel : themeConfig.label}
              </span>
            </button>
            {headerThemeOpen && (
              <div className="tree-popover-enter absolute top-12 left-0 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#0a0f21]/95 p-1.5 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-2.5 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {lang === "hi" ? "रंग थीम" : "Color Theme"}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {Object.keys(THEMES).length}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {Object.values(THEMES).map((tItem) => {
                    const isSelected = theme === tItem.id;
                    return (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => {
                          setTheme(tItem.id);
                          setHeaderThemeOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition ${
                          isSelected
                            ? "bg-white/15 text-white font-semibold ring-1 ring-white/20"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="h-4 w-4 rounded-full shrink-0 border border-white/30"
                            style={{
                              background: `linear-gradient(135deg, ${tItem.primary}, ${tItem.accent})`,
                            }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {lang === "hi" ? tItem.hindiLabel : tItem.label}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-amber-400 font-bold ml-1 text-xs">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <div
            className="flex items-center rounded-lg border border-[#2e3b5e] bg-[#0c1228] p-0.5 text-xs shadow-inner"
            role="group"
            aria-label="Language selection"
          >
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                lang === "en"
                  ? "bg-[#8a5cff] text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Display tree in English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("hi")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                lang === "hi"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-amber-300"
              }`}
              title="हिंदी में देखें (Show names & UI in Hindi)"
            >
              हिंदी
            </button>
          </div>

          {isLoggedIn && isAdmin && (
            <button
              type="button"
              onClick={() => setShowTranslateModal(true)}
              className="lineage-header-button whitespace-nowrap flex items-center gap-1.5 text-amber-300 border-amber-500/30 hover:border-amber-400/70 hover:bg-amber-500/10 transition"
              title="Translate family names to Hindi Devanagari and save to database"
            >
              <span className="text-sm">🇮🇳</span>
              <span>{lang === "hi" ? "हिंदी नाम अनुवाद" : "Hindi Names"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPageSplashComplete(false)}
            className="lineage-header-button whitespace-nowrap flex items-center gap-1.5 text-amber-300 border-amber-500/30 hover:border-amber-400/70 hover:bg-amber-500/10 transition"
            title="Watch Heritage Chronicles & Lineage Splash"
          >
            <span className="text-sm">🔥</span>
            <span>Heritage Lore</span>
          </button>
          {!isLoggedIn && (
            <button
              onClick={() => setShowContact(true)}
              className="lineage-header-button whitespace-nowrap"
            >
              Contact Us
            </button>
          )}
          <button
            type="button"
            onClick={handleFocusAdmin}
            className={`lineage-header-button whitespace-nowrap transition ${
              focusId === adminPersonId
                ? "border-[#8a5cff] bg-[#1a153b] text-[#cbb8ff] shadow-[0_0_12px_rgba(138,92,255,0.25)]"
                : "hover:border-[#8a5cff]/40"
            }`}
            title={`Focus tree on Admin (${adminName})`}
          >
            <span className="text-sm text-amber-400">👑</span>
            <span>
              {focusId === adminPersonId ? "Admin Focus" : "Focus on Admin"}
            </span>
          </button>
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
                  /* eslint-disable-next-line @next/next/no-img-element */
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
                        /* eslint-disable-next-line @next/next/no-img-element */
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
                        handleFocusAdmin();
                        setProfileMenuOpen(false);
                      }}
                    >
                      <span className="lineage-account-icon">👑</span>
                      <span>Focus on Admin ({adminName})</span>
                    </button>
                    {isAdmin && (
                      <button
                        className="lineage-account-item"
                        onClick={() => {
                          if (focusId) handleSetAsDefaultFocus(focusId);
                          setProfileMenuOpen(false);
                        }}
                      >
                        <span className="lineage-account-icon">📌</span>
                        <span>Set Current as Default Focus</span>
                      </button>
                    )}
                    {isLoggedIn && isAdmin && (
                      <button
                        className="lineage-account-item"
                        onClick={() => {
                          setShowTranslateModal(true);
                          setProfileMenuOpen(false);
                        }}
                      >
                        <span className="lineage-account-icon">🇮🇳</span>
                        <span>
                          {lang === "hi"
                            ? "हिंदी नाम अनुवाद"
                            : "Translate Names to Hindi"}
                        </span>
                      </button>
                    )}
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
                      setShowContact(true);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span className="lineage-account-icon">✉</span>
                    <span>Contact Admin</span>
                  </button>

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
                /* eslint-disable-next-line @next/next/no-img-element */
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
                      /* eslint-disable-next-line @next/next/no-img-element */
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
                    handleFocusAdmin();
                    setProfileMenuOpen(false);
                  }}
                >
                  <span className="lineage-account-icon">👑</span>
                  <span>Focus on Admin ({adminName})</span>
                </button>
                {isAdmin && (
                  <button
                    className="lineage-account-item"
                    onClick={() => {
                      if (focusId) handleSetAsDefaultFocus(focusId);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span className="lineage-account-icon">📌</span>
                    <span>Set Current as Default Focus</span>
                  </button>
                )}
                {isLoggedIn && isAdmin && (
                  <button
                    className="lineage-account-item"
                    onClick={() => {
                      setShowTranslateModal(true);
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span className="lineage-account-icon">🇮🇳</span>
                    <span>
                      {lang === "hi"
                        ? "हिंदी नाम अनुवाद"
                        : "Translate Names to Hindi"}
                    </span>
                  </button>
                )}
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
            {/* Mobile Language Switcher */}
            <div className="mb-3 flex items-center justify-between rounded-lg border border-[#2e3b5e] bg-[#0c1228] p-1 text-xs">
              <span className="px-2 text-slate-400 font-medium">
                Language / भाषा:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`rounded-md px-3 py-1 text-xs transition-all ${
                    lang === "en"
                      ? "bg-[#8a5cff] text-white font-semibold shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang("hi")}
                  className={`rounded-md px-3 py-1 text-xs transition-all ${
                    lang === "hi"
                      ? "bg-amber-500 text-slate-950 font-bold shadow"
                      : "text-slate-400 hover:text-amber-300"
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {isLoggedIn && isAdmin && (
                <button
                  onClick={() => {
                    setShowTranslateModal(true);
                    setMenuOpen(false);
                  }}
                  className="lineage-menu-button flex items-center gap-2 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <span>🇮🇳</span>
                  <span>
                    {lang === "hi"
                      ? "हिंदी नाम अनुवाद"
                      : "Translate Names to Hindi"}
                  </span>
                </button>
              )}
              <button
                onClick={() => {
                  setIsPageSplashComplete(false);
                  setMenuOpen(false);
                }}
                className="lineage-menu-button flex items-center gap-2 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
              >
                <span className="text-amber-400">🔥</span>
                <span>Heritage Lore & Splash</span>
              </button>
              <button
                onClick={() => {
                  handleFocusAdmin();
                  setMenuOpen(false);
                }}
                className={`lineage-menu-button flex items-center gap-2 ${
                  focusId === adminPersonId
                    ? "border-[#8a5cff] bg-[#1a153b] text-[#cbb8ff]"
                    : ""
                }`}
              >
                <span className="text-amber-400">👑</span>
                <span>Focus on Admin ({adminName})</span>
              </button>
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
        <div className="flex-1 h-full w-full relative">
          {focusId ? (
            <FamilyTree
              key={`${focusId}-${refreshKey}`}
              focusId={focusId}
              isAdmin={isAdmin}
              isLoggedIn={isLoggedIn}
              onSelectPerson={(id) => setSelectedId(id)}
              onTreeLoaded={handleTreeLoaded}
              onFocusAdmin={handleFocusAdmin}
              adminPersonId={adminPersonId}
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
            onFocusPerson={(id) => {
              setFocusId(id);
              setSelectedId(id);
              setFocusNotice("Tree focus changed.");
              setTimeout(() => setFocusNotice(null), 2500);
            }}
            adminPersonId={adminPersonId}
            onFocusAdmin={handleFocusAdmin}
            onSetDefaultFocus={isAdmin ? handleSetAsDefaultFocus : undefined}
            currentFocusId={focusId ?? undefined}
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
        <div className="themed-login-backdrop fixed inset-0 z-40 flex items-center justify-center px-4">
          <form
            onSubmit={handleLogin}
            className="themed-login-form w-full max-w-xs rounded-card p-5"
          >
            <h2 className="themed-login-title mb-3 font-display text-lg font-semibold">
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
              className="themed-login-input mb-2 w-full rounded-card px-3 py-2 text-sm"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, password: e.target.value }))
              }
              className="themed-login-input mb-3 w-full rounded-card px-3 py-2 text-sm"
            />
            {loginError && (
              <p className="mb-2 text-sm text-rose">{loginError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="themed-login-submit rounded-card px-4 py-2 text-sm"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => setShowLogin(false)}
                className="themed-login-cancel rounded-card px-4 py-2 text-sm"
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

      {showTranslateModal && (
        <HindiTranslateModal
          onClose={() => setShowTranslateModal(false)}
          onTranslated={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {focusNotice && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[#8a5cff]/40 bg-[#0d132a]/95 px-4 py-2.5 text-xs font-medium text-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.6)] backdrop-blur transition-all duration-200"
        >
          <span className="text-amber-400">👑</span>
          <span>{focusNotice}</span>
        </div>
      )}
    </main>
  );
}
