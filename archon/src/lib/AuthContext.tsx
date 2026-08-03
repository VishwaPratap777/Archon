'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  tokenUsage: UserTokenUsage;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          tokenUsage: data.tokenUsage || {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            requestCount: 0,
          },
        });
      } else {
        // Token expired or invalid
        localStorage.removeItem('archon_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('archon_token');
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    localStorage.setItem('archon_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    localStorage.setItem('archon_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('archon_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchProfile(token);
    }
  };

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthModalOpen,
        authModalTab,
        login,
        register,
        logout,
        refreshUser,
        openAuthModal,
        closeAuthModal,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
