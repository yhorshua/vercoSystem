'use client';

import { useUser } from '../context/UserContext';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser(); // ✅ ahora tomamos 'user'
  const pathname = usePathname();

  // ✅ mostramos navbar solo si hay usuario logueado
  const showNavbar = pathname !== '/login' && !!user;

  return (
    <div className="layoutWrapper">
      {showNavbar && <Navbar />}
      <main className="contentWrapper">{children}</main>
      <Footer /> {/* El Footer siempre estará aquí */}
    </div>
  );
}
