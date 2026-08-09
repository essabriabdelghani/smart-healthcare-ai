import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import * as authService from "../services/authService";
import type { User, UserRole } from "../types/user";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (email: string, password: string) => Promise<User>;

  register: (
    full_name: string,
    email: string,
    password: string,
    role: UserRole
  ) => Promise<User>;

  logout: () => void;

  refreshUser: () => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load current user
   */
  const refreshUser = useCallback(async () => {
    const me = await authService.getMe();
    setUser(me);
    return me;
  }, []);

  /**
   * Restore session
   */
  useEffect(() => {
    async function restoreSession() {
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch {
        authService.logout();
        setUser(null);
      }
      setLoading(false);
    }

    restoreSession();
  }, [refreshUser]);

  /**
   * Login
   */
  const login = useCallback(
    async (email: string, password: string) => {
      await authService.login({
        email,
        password,
      });

      return refreshUser();
    },
    [refreshUser]
  );

  /**
   * Register
   */
  const register = useCallback(
    async (
      full_name: string,
      email: string,
      password: string,
      role: UserRole
    ) => {
      await authService.register({
        full_name,
        email,
        password,
        role,
      });

      await authService.login({
        email,
        password,
      });

      return refreshUser();
    },
    [refreshUser]
  );

  /**
   * Logout
   */
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}