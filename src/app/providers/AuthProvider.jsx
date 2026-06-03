import React, { createContext, useState, useEffect } from 'react';
import { AuthService } from '../../domain/services/AuthService';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Função para verificar se já existe uma sessão ativa ao abrir o app
    const checkUser = async () => {
      try {
        const currentSession = await AuthService.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          const profile = await AuthService.getUserProfile(currentSession.user.id);
          setUser({ ...currentSession.user, ...profile });
        }
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (email, password) => {
    const data = await AuthService.login(email, password);
    setSession(data.session);
    
    // Após logar no Auth, busca os detalhes na tabela 'users'
    const profile = await AuthService.getUserProfile(data.user.id);
    setUser({ ...data.user, ...profile });
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};