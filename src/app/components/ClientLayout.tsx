'use client';

import { useUser } from '../context/UserContext';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { username } = useUser();
  const pathname = usePathname();

  const showNavbar = pathname !== '/login' && !!username;

  return (
    <>
      {showNavbar && <Navbar />}
      <main>{children}</main>
    </>
  );
}
