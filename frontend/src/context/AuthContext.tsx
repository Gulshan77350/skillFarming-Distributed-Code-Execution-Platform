import { createContext, useContext, useState, type ReactNode } from 'react';

interface User { id: number; username: string; email: string; }
interface AuthCtx { user: User | null; token: string | null; login: (u: User, t: string) => void; logout: () => void; }

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,  setUser]  = useState<User | null>(() => {
    const s = localStorage.getItem('oj_user');
    return s ? JSON.parse(s) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('oj_token'));

  const login = (u: User, t: string) => {
    setUser(u); setToken(t);
    localStorage.setItem('oj_user', JSON.stringify(u));
    localStorage.setItem('oj_token', t);
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('oj_user');
    localStorage.removeItem('oj_token');
  };

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext)!;
