"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface SessionUser {
  email: string;
  name: string;
  role: "admin" | "editor";
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<string | null>; // returns error message, or null on success
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    role?: "admin" | "editor",
  ) => Promise<string | null>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (res.ok) {
        setUser(json.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Login failed.";
    setUser(json.data);
    return null;
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role?: "admin" | "editor",
  ) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });
    const json = await res.json();
    if (!res.ok) return json.error ?? "Registration failed.";
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isAdmin: user?.role === "admin",
        login,
        logout,
        register,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
