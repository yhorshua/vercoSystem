'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// Definimos el tipo para el contexto
interface UserContextType {
  username: string;
  userArea: 'jefeVentas' | 'vendedor' | 'tienda'; // Añadido el rol "tienda"
  setUser: (username: string, userArea: 'jefeVentas' | 'vendedor' | 'tienda') => void; // Actualizado para aceptar "tienda"
}

// Creamos el contexto
const UserContext = createContext<UserContextType | undefined>(undefined);

// Componente que proporciona el contexto
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string>('');
  const [userArea, setUserArea] = useState<'jefeVentas' | 'vendedor' | 'tienda'>('vendedor'); // rol predeterminado actualizado

  // Recuperar del localStorage al cargar la página
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedUserArea = localStorage.getItem('userArea') as 'jefeVentas' | 'vendedor' | 'tienda'; // Permitimos "tienda" también
    if (storedUsername && storedUserArea) {
      setUsername(storedUsername);
      setUserArea(storedUserArea);
    }
  }, []);

  // Función que actualiza el contexto y también guarda en localStorage
  const setUser = (username: string, userArea: 'jefeVentas' | 'vendedor' | 'tienda') => {
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
