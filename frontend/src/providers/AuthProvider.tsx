"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, TokenResponse } from "@/types";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: TokenResponse) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get<User>("/users/me");
      setUser(res.data);
      localStorage.setItem("ergon_user", JSON.stringify(res.data));
    } catch (err) {
      setUser(null);
      localStorage.removeItem("ergon_access_token");
      localStorage.removeItem("ergon_refresh_token");
      localStorage.removeItem("ergon_user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("ergon_access_token");
      if (savedToken) {
        setToken(savedToken);
        fetchUser();
      } else {
        setIsLoading(false);
      }
    }
  }, [fetchUser]);

  const login = (tokens: TokenResponse) => {
    localStorage.setItem("ergon_access_token", tokens.access_token);
    localStorage.setItem("ergon_refresh_token", tokens.refresh_token);
    setToken(tokens.access_token);
    setIsLoading(true);
    fetchUser();
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("ergon_refresh_token");
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } catch (err) {
      }
    }
    localStorage.removeItem("ergon_access_token");
    localStorage.removeItem("ergon_refresh_token");
    localStorage.removeItem("ergon_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
