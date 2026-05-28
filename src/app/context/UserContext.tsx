'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';

import { useRouter } from 'next/navigation';

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
  status: {
    type: string;
    data: number[];
  };
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
  state_user: any;
  warehouse_id: number;
  warehouse: Warehouse | null;
  token: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(
  undefined
);

export const UserProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {

  const [user, setUser] = useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {

    if (typeof window === 'undefined') return;

    try {

      const token = localStorage.getItem('access_token');

      const savedUser = localStorage.getItem('user_data');

      if (token && savedUser) {

        const parsedUser = JSON.parse(savedUser);

        setUser(parsedUser);
      }

    } catch (error) {

      console.error(
        'Error cargando usuario',
        error
      );

    } finally {

      setLoading(false);
    }

  }, []);

  const logout = () => {

    localStorage.removeItem('access_token');

    localStorage.removeItem('user_data');

    document.cookie =
      'access_token=; path=/; max-age=0';

    setUser(null);

    router.push('/login');
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        setUser,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {

  const context = useContext(UserContext);

  if (!context) {
    throw new Error(
      'useUser debe usarse dentro de UserProvider'
    );
  }

  return context;
};