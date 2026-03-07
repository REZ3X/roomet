"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authAPI } from "@/lib/api-client";
import { generateKeyPair } from "@/lib/encryption";

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarType: string;
  bio: string | null;
  emailVerified: boolean;
  publicKey: string | null;
  createdAt: string;
  profile: Record<string, unknown> | null;
  achievements: Record<string, unknown>[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setTokenFromCallback: (token: string) => void;
  loginWithToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PRIVATE_KEY_STORAGE = "roomet_private_key";
const TOKEN_STORAGE = "roomet_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureKeyPair = useCallback(
    async (currentToken: string, currentUser: User) => {
      if (!currentUser.publicKey) {
        try {
          const keyPair = await generateKeyPair();
          localStorage.setItem(PRIVATE_KEY_STORAGE, keyPair.privateKey);
          await authAPI.storePublicKey(currentToken, keyPair.publicKey);
        } catch (e) {
          console.error("Failed to generate key pair:", e);
        }
      } else if (!localStorage.getItem(PRIVATE_KEY_STORAGE)) {
        const keyPair = await generateKeyPair();
        localStorage.setItem(PRIVATE_KEY_STORAGE, keyPair.privateKey);
        await authAPI.storePublicKey(currentToken, keyPair.publicKey);
      }
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const storedToken = token || localStorage.getItem(TOKEN_STORAGE);
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await authAPI.me(storedToken);
      setUser(data.user as unknown as User);
      setToken(storedToken);
      localStorage.setItem(TOKEN_STORAGE, storedToken);
      await ensureKeyPair(storedToken, data.user as unknown as User);
    } catch {
      localStorage.removeItem(TOKEN_STORAGE);
      // Keep private key — removing it forces key regeneration on next login,
      // which invalidates all existing encrypted room keys.
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [token, ensureKeyPair]);

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authAPI.login({ email, password });
    setToken(data.token);
    setUser(data.user as unknown as User);
    localStorage.setItem(TOKEN_STORAGE, data.token);
    await ensureKeyPair(data.token, data.user as unknown as User);
  };

  const register = async (regData: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => {
    const data = await authAPI.register(regData);
    setToken(data.token);
    setUser(data.user as unknown as User);
    localStorage.setItem(TOKEN_STORAGE, data.token);
  };

  const logout = async () => {
    if (token) {
      try {
        await authAPI.logout(token);
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem(TOKEN_STORAGE);
    setUser(null);
    setToken(null);
  };

  const setTokenFromCallback = (callbackToken: string) => {
    setLoading(true);
    setToken(callbackToken);
    localStorage.setItem(TOKEN_STORAGE, callbackToken);
    refreshUser();
  };

  const loginWithToken = useCallback(
    (newToken: string) => {
      setLoading(true);
      setToken(newToken);
      localStorage.setItem(TOKEN_STORAGE, newToken);

      authAPI
        .me(newToken)
        .then((data) => {
          setUser(data.user as unknown as User);
          ensureKeyPair(newToken, data.user as unknown as User);
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_STORAGE);
          setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [ensureKeyPair],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
        setTokenFromCallback,
        loginWithToken,
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

export function getPrivateKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PRIVATE_KEY_STORAGE);
}
