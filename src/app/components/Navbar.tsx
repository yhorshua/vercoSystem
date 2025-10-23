'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '../context/UserContext';
import style from './page.module.css';

const Navbar = () => {
  const { user, logout } = useUser(); // obtenemos el user completo
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const router = useRouter();

const handleLogout = () => {
    logout(); // limpia el contexto y localStorage
    router.push('/login'); // ✅ redirige al login sin recargar
  };

  if (!user) return null;
  // Los roles vienen desde user.role (por ejemplo "Administrador")
  const role = user.role.toLowerCase(); // -> "administrador", "vendedor", etc.

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleReportMenu = () => setIsReportOpen(!isReportOpen);
  const handleLinkClick = () => setIsMenuOpen(false);

  return (
    <nav className={style.navbar}>
      <div className={style.navbarLogo}>
        <Image src="/img/verco_logo.png" alt="Logo Empresa" width={100} height={40} />
      </div>

      <div className={style.hamburger} onClick={toggleMenu}>
        <span className={style.bar}></span>
        <span className={style.bar}></span>
        <span className={style.bar}></span>
      </div>

      {/* ✅ Menú centrado según rol */}
      <div className={style.navbarCenter}>
        {role === 'vendedor' && (
          <>
            <Link href="/register-requested" className={style.navbarLink}>Registrar Pedido</Link>
            <Link href="/order-list" className={style.navbarLink}>Lista de Pedidos</Link>
            <Link href="/stock" className={style.navbarLink}>Stock</Link>
            <Link href="/client" className={style.navbarLink}>Registro de Cliente</Link>
          </>
        )}

        {role === 'administrador' && (
          <>
            <Link href="/register-requested" className={style.navbarLink}>Registrar Pedido</Link>
            <Link href="/order-list" className={style.navbarLink}>Lista de Pedidos</Link>
            <Link href="/stock" className={style.navbarLink}>Stock</Link>
            <Link href="/client" className={style.navbarLink}>Registro de Cliente</Link>
            <Link href="/abono" className={style.navbarLink}>Registro de Abono</Link>
            <Link href="/qr" className={style.navbarLink}>Generador de etiquetas</Link>
            <Link href="/inventory" className={style.navbarLink}>Inventario</Link>
            <Link href="/production" className={style.navbarLink}>Ingreso de Producción</Link>

            <div className={style.reportDropdown}>
              <button onClick={toggleReportMenu} className={style.navbarLink}>
                Reportes
              </button>
              {isReportOpen && (
                <div className={style.dropdownMenu}>
                  <Link href="/report-client" className={style.navbarLink} onClick={handleLinkClick}>
                    Reporte por Cliente
                  </Link>
                  <Link href="/report-vendedor" className={style.navbarLink} onClick={handleLinkClick}>
                    Reporte por Vendedor
                  </Link>
                  <Link href="/report-pedidos" className={style.navbarLink} onClick={handleLinkClick}>
                    Reporte por Pedidos
                  </Link>
                  <Link href="/report-fechas" className={style.navbarLink} onClick={handleLinkClick}>
                    Reporte por Fecha
                  </Link>
                </div>
              )}
            </div>
          </>
        )}

        {role === 'tienda' && (
          <>
            <Link href="/stock" className={style.navbarLink}>Stock</Link>
            <Link href="/inventory" className={style.navbarLink}>Inventario</Link>
            <Link href="/sale" className={style.navbarLink}>Venta</Link>
            <Link href="/merchandise" className={style.navbarLink}>Ingreso a Stock</Link>
          </>
        )}
      </div>

      <div className={`${style.navbarRight} ${isMenuOpen ? style.open : ''}`}>
        <div className={style.userInfo}>
          <Image src="/img/unnamed.jpg" alt="User Avatar" width={40} height={40} className={style.userAvatar} />
        </div>
        <div className={style.userDetails}>
          <span className={style.username}>{user.fullName}</span>
          <span className={style.userArea}>{user.role}</span>
        </div>

        <button onClick={handleLogout} className={style.logoutButton}>Cerrar sesión</button>
      </div>
    </nav>
  );
};

export default Navbar;
