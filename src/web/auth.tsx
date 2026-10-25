import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "../shared/constants";
import { api, ApiError, UNAUTHORIZED_EVENT, type SessionUser } from "./api";

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<SessionUser>("/auth/me")
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) console.error(e);
      })
      .finally(() => setLoading(false));

    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await api<SessionUser>("/auth/login", { method: "POST", body: { email, password } }));
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => !!user && roles.includes(user.role), [user]);

  return <AuthContext value={{ user, loading, login, logout, hasRole }}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The logged-in user; only call this inside routes that are already behind login. */
export function useUser() {
  const { user } = useAuth();
  if (!user) throw new Error("useUser called without a logged-in user");
  return user;
}
