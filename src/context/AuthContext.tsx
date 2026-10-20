import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  subscribeToAuthChanges 
} from '../firebase/authService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  loginGoogle: () => Promise<User>;
  loginEmail: (email: string, pass: string) => Promise<User>;
  registerEmail: (email: string, pass: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    return await loginWithGoogle();
  };

  const loginEmail = async (email: string, pass: string) => {
    return await loginWithEmail(email, pass);
  };

  const registerEmail = async (email: string, pass: string, name: string) => {
    return await registerWithEmail(email, pass, name);
  };

  const logout = async () => {
    await logoutUser();
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        loginGoogle,
        loginEmail,
        registerEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
