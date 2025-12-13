import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

interface AuthContextValue {
  token: string | null;
  isAuthed: boolean;
  login(email: string, password: string): Promise<void>;
  signup(email: string, password: string): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
  };

  const signup = async (email: string, password: string) => {
    const { data } = await api.post("/auth/signup", { email, password });
    setToken(data.token);
  };

  const logout = () => setToken(null);

  return (
    <AuthContext.Provider value={{ token, isAuthed: Boolean(token), login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


