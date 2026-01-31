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

  const toggleMenu = () => {
    setIsMenuOpen((v) => !v);
    setIsReportOpen(false); // ✅ opcional: resetea reportes al abrir/cerrar
  };

  const toggleReportMenu = () => setIsReportOpen((v) => !v);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
    setIsReportOpen(false);
  };

  // ✅ Links reutilizables (misma lógica que tu navbarCenter)
  const RoleLinks = () => (
    <>
      {role === 'vendedor' && (
        <>
          <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>
            Registrar Pedido
          </Link>
          <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>
            Lista de Pedidos
          </Link>
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            Stock
          </Link>
          <Link href="/client" className={style.navbarLink} onClick={handleLinkClick}>
            Registro de Cliente
          </Link>
        </>
      )}

      {role === 'administrador' && (
        <>
          <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>
            Registrar Pedido
          </Link>
          <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>
            Lista de Pedidos
          </Link>
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            Stock
          </Link>
          <Link href="/client" className={style.navbarLink} onClick={handleLinkClick}>
            Registro de Cliente
          </Link>
          <Link href="/abono" className={style.navbarLink} onClick={handleLinkClick}>
            Registro de Abono
          </Link>
          <Link href="/qr" className={style.navbarLink} onClick={handleLinkClick}>
            Generador de etiquetas
          </Link>
          <Link href="/inventory" className={style.navbarLink} onClick={handleLinkClick}>
            Inventario
          </Link>
          <Link href="/production" className={style.navbarLink} onClick={handleLinkClick}>
            Ingreso de Producción
          </Link>
          <Link href="/register-stock" className={style.navbarLink} onClick={handleLinkClick}>
            Registro de stock
          </Link>
          <Link href="/register-product" className={style.navbarLink} onClick={handleLinkClick}>
            Registro de productos
          </Link>

          <div className={style.reportDropdown}>
            <button onClick={toggleReportMenu} className={style.navbarLink} type="button">
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
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            Stock
          </Link>
          <Link href="/inventory" className={style.navbarLink} onClick={handleLinkClick}>
            Inventario
          </Link>
          <Link href="/sale" className={style.navbarLink} onClick={handleLinkClick}>
            Venta
          </Link>
          <Link href="/merchandise" className={style.navbarLink} onClick={handleLinkClick}>
            Ingreso a Stock
          </Link>
          <Link href="/caja" className={style.navbarLink} onClick={handleLinkClick}>
            Caja
          </Link>
          <Link href="/role" className={style.navbarLink} onClick={handleLinkClick}>
            Roles
          </Link>
          <Link href="/warehouses" className={style.navbarLink} onClick={handleLinkClick}>
            Almacenes
          </Link>
          <Link href="/user" className={style.navbarLink} onClick={handleLinkClick}>
            Usuarios
          </Link>
          <Link href="/register-stock" className={style.navbarLink} onClick={handleLinkClick}>
            Registro de stock
          </Link>
          <Link href="/register-product" className={style.navbarLink} onClick={handleLinkClick}>
            Registro de productos
          </Link>

          <div className={style.reportDropdown}>
            <button onClick={toggleReportMenu} className={style.navbarLink} type="button">
              Reportes
            </button>
            {isReportOpen && (
              <div className={style.dropdownMenu}>
                <Link href="/reportsale" className={style.navbarLink} onClick={handleLinkClick}>
                  Reporte de Venta
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      <nav className={style.navbar}>
        <div className={style.navbarLogo}>
          <Image src="/img/verco_logo.png" alt="Logo Empresa" width={100} height={40} />
        </div>

        <div className={style.hamburger} onClick={toggleMenu}>
          <span className={style.bar}></span>
          <span className={style.bar}></span>
          <span className={style.bar}></span>
        </div>

        {/* ✅ Menú centrado (DESKTOP) según rol */}
        <div className={style.navbarCenter}>
          <RoleLinks />
        </div>

        {/* ✅ Panel lateral / user panel (DESKTOP) y también contenedor del menú en MOBILE */}
        <div className={`${style.navbarRight} ${isMenuOpen ? style.open : ''}`}>
          <div className={style.userInfo}>
            <Image src="/img/unnamed.jpg" alt="User Avatar" width={40} height={40} className={style.userAvatar} />
          </div>

          <div className={style.userDetails}>
            <span className={style.username}>{user.fullName}</span>
            <span className={style.userArea}>{user.role}</span>
          </div>

          {/* ✅ AQUÍ se muestran tus pestañas cuando es MOBILE y se abre la hamburguesa */}
          <div className={style.navbarMobileLinks}>
            <RoleLinks />
          </div>

          <button onClick={handleLogout} className={style.logoutButton}>
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* ✅ Overlay para cerrar tocando afuera (solo cuando menú está abierto) */}
      {isMenuOpen && <div className={style.overlay} onClick={() => setIsMenuOpen(false)} />}
    </>
  );
};

export default Navbar;
