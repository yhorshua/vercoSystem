'use client';

import { useUser } from '../context/UserContext';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser(); // ✅ ahora tomamos 'user'
  const pathname = usePathname();

  // ✅ mostramos navbar solo si hay usuario logueado
  const showNavbar = pathname !== '/login' && !!user;

  return (
    <>
      {showNavbar && <Navbar />}
      <main>{children}</main>
    </>
  );
}
