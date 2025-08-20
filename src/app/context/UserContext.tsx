'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// Definimos el tipo para el contexto
interface UserContextType {
  username: string;
  userArea: string;
  setUser: (username: string, userArea: string) => void;
}

// Creamos el contexto
const UserContext = createContext<UserContextType | undefined>(undefined);

// Componente que proporciona el contexto
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string>('');
  const [userArea, setUserArea] = useState<string>('');

  // Recuperar del localStorage al cargar la página
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedUserArea = localStorage.getItem('userArea');
    if (storedUsername && storedUserArea) {
      setUsername(storedUsername);
      setUserArea(storedUserArea);
    }
  }, []);

  // Función que actualiza el contexto y también guarda en localStorage
  const setUser = (username: string, userArea: string) => {
    localStorage.setItem('username', username);
    localStorage.setItem('userArea', userArea);
    setUsername(username);
    setUserArea(userArea);
  };

  return (
    <UserContext.Provider value={{ username, userArea, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook para acceder al contexto en cualquier parte de la aplicación
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
