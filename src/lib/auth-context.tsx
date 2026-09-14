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
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("lineage_token")
          : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/auth/me", { headers });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (res.ok && json.data) {
          setUser(json.data);
          return;
        }
      }
      setUser(null);
      if (res.status === 401 && token && typeof window !== "undefined") {
        localStorage.removeItem("lineage_token");
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return "Server returned an invalid response. Please try again.";
      }
      const json = await res.json();
      if (!res.ok) return json.error ?? "Login failed.";

      if (json.data?.token && typeof window !== "undefined") {
        localStorage.setItem("lineage_token", json.data.token);
      }
      setUser(json.data);
      return null;
    } catch (err: any) {
      return err.message || "Login request failed.";
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("lineage_token");
      }
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
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
