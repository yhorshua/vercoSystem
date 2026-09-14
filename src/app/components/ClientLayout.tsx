'use client';

import { useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const publicRoute = pathname === '/login' || pathname === '/politica-privacidad';

  useEffect(() => {
    if (!loading && !user && !publicRoute) {
      router.replace('/login');
      router.refresh();
    }
  }, [loading, publicRoute, router, user]);

  if (loading) {
    return null;
  }

  // Nunca vuelve a renderizar una pantalla protegida con user=null durante logout.
  if (!user && !publicRoute) return null;

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
