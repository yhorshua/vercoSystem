'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Interfaz de Role, Warehouse, StateUser, User
export interface Role {
  id: number;
  name_role: string;
}

export interface StateUser {
  type: string;
  data: number[];
}

export interface Warehouse {
  id: number;
  warehouse_name: string;
  type: string;
  location: string;
  status: { type: string; data: number[] };
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  cellphone: string;
  address_home: string;
  id_cedula: string;
  rol_id: number;
  role: Role;
  date_register: string;
  state_user: string;
  warehouse_id: number;
  warehouse: Warehouse | null;  // Asegúrate de que puede ser null mientras se carga
  token: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isClientSide, setIsClientSide] = useState(false); // Controlar la ejecución en el cliente
  const router = useRouter();

  // Recuperar datos del usuario desde el localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsClientSide(true); // Solo se ejecuta en el cliente

      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user_data');

      if (token && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
        } catch (error) {
          console.error('Error al parsear los datos del usuario:', error);
        }
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setUser(null);
    router.push('/login');
  };

  if (!isClientSide) {
    return null; // No renderizar nada en el servidor
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser debe usarse dentro de UserProvider');
  return context;
};
