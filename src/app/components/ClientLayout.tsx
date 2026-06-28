'use client';

import { useUser } from '../context/UserContext';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();

  if (loading) {
  return null;
}

  // ✅ mostramos navbar y footer solo si hay usuario logueado
  const showLayout = pathname !== '/login' && !!user;

  return (
    <div className="layoutWrapper">
      {showLayout && <Navbar />}
      <main className="contentWrapper">{children}</main>
      {showLayout && <Footer />}
    </div>
  );
}
