'use client';

import React, { createContext, useState, useContext } from 'react';

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
  const [username, setUsername] = useState<string>(''); // Valor inicial vacío
  const [userArea, setUserArea] = useState<string>(''); // Valor inicial vacío

  // Función que actualiza el contexto
  const setUser = (username: string, userArea: string) => {
    console.log('Setting user:', username, userArea); // Verifica que setUser se ejecuta
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
