import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuth, getUser, saveAuth } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());

  const syncFromStorage = () => {
    try {
      setUser(getUser());
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    // Update when auth changes in this tab (custom event) or other tabs (storage)
    const onAuthChanged = () => syncFromStorage();
    window.addEventListener("auth-changed", onAuthChanged);
    window.addEventListener("storage", onAuthChanged);
    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      window.removeEventListener("storage", onAuthChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (payload) => {
    saveAuth(payload);
    syncFromStorage();
    window.dispatchEvent(new Event("auth-changed"));
  };

  const logout = () => {
    clearAuth();
    syncFromStorage();
    window.dispatchEvent(new Event("auth-changed"));
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider/>");
  return ctx;
}
