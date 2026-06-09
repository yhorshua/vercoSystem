'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

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
  undefined,
);

const setCookie = (
  name: string,
  value: string,
  maxAgeSeconds = 86400,
) => {
  if (typeof window === 'undefined') return;

  const secure =
    window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
};

const deleteCookie = (name: string) => {
  if (typeof window === 'undefined') return;

  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

export const UserProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [userState, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const token = localStorage.getItem('access_token');
      const savedUser = localStorage.getItem('user_data');

      if (token && savedUser) {
        const parsedUser: User = JSON.parse(savedUser);

        setUserState({
          ...parsedUser,
          token,
        });

        // Sincroniza cookies por si se recarga la página
        setCookie('access_token', token);
        setCookie('role', parsedUser.role?.name_role || '');
      }
    } catch (error) {
      console.error('Error cargando usuario', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const setUser = (nextUser: User | null) => {
    if (typeof window === 'undefined') {
      setUserState(nextUser);
      return;
    }

    if (!nextUser) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');

      deleteCookie('access_token');
      deleteCookie('role');

      setUserState(null);
      return;
    }

    const token = nextUser.token;
    const role = nextUser.role?.name_role || '';

    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify(nextUser));

    setCookie('access_token', token);
    setCookie('role', role);

    setUserState(nextUser);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');

    deleteCookie('access_token');
    deleteCookie('role');

    setUserState(null);
  };

  return (
    <UserContext.Provider
      value={{
        user: userState,
        loading,
        setUser,
        logout,
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
      'useUser debe usarse dentro de UserProvider',
    );
  }

  return context;
};