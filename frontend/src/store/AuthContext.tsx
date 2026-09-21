import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/client';
import { authApi } from '../api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('billsplit_token');
    const savedUser = localStorage.getItem('billsplit_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('billsplit_user');
      }
      // Verify token is still valid
      authApi.me()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('billsplit_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common['Authorization'];
          localStorage.removeItem('billsplit_token');
          localStorage.removeItem('billsplit_user');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const res = await authApi.login({ email: cleanEmail, password });
    const { user: userData, token: tokenData } = res.data;
    setUser(userData);
    setToken(tokenData);
    api.defaults.headers.common['Authorization'] = `Bearer ${tokenData}`;
    localStorage.setItem('billsplit_token', tokenData);
    localStorage.setItem('billsplit_user', JSON.stringify(userData));
  };

  const register = async (name: string, email: string, password: string, phone?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone?.trim() || undefined;
    const res = await authApi.register({ name: cleanName, email: cleanEmail, password, phone: cleanPhone });
    const { user: userData, token: tokenData } = res.data;
    setUser(userData);
    setToken(tokenData);
    api.defaults.headers.common['Authorization'] = `Bearer ${tokenData}`;
    localStorage.setItem('billsplit_token', tokenData);
    localStorage.setItem('billsplit_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('billsplit_token');
    localStorage.removeItem('billsplit_user');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
