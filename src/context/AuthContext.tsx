import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'user' | 'admin';

interface User {
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Predefined users
const USERS: { [email: string]: { password: string; role: UserRole; name: string } } = {
  'preproduction@learnapp.com': {
    password: '123456',
    role: 'user',
    name: 'ShootFlow Team'
  },
  'admin@learnapp.com': {
    password: '123456',
    role: 'admin',
    name: 'Admin'
  }
};

const AUTH_STORAGE_KEY = 'preproduction_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Load user from localStorage on initial load
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Save user to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const login = (email: string, password: string): boolean => {
    const normalizedEmail = email.toLowerCase().trim();
    const userConfig = USERS[normalizedEmail];
    
    if (userConfig && userConfig.password === password) {
      setUser({
        email: normalizedEmail,
        role: userConfig.role,
        name: userConfig.name
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isAuthenticated: user !== null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
