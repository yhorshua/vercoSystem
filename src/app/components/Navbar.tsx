'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Usamos Link para la redirección en Next.js
import { useUser } from '../context/UserContext';
import style from './page.module.css'; // Importamos los estilos de CSS Module

// Definimos los roles como constantes
const JEFEVEN = 'jefeVentas';
const VENDEDO = 'vendedor';

const Navbar = () => {
  const { username, userArea } = useUser(); // Accedemos al contexto para obtener el username y userArea
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false); // Estado para abrir/cerrar el reporte

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Alternar el estado del menú
  };

  const toggleReportMenu = () => {
    setIsReportOpen(!isReportOpen); // Alternar el estado del menú de reportes
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false); // Cierra el menú cuando se hace clic en un enlace
  };

  return (
    <nav className={style.navbar}>
      {/* Logo */}
      <div className={style.navbarLogo}>
        <Image
          src="/img/verco_logo.png"
          alt="Logo Empresa"
          width={100}
          height={40}
        />
      </div>

      {/* Botón de menú hamburguesa */}
      <div className={style.hamburger} onClick={toggleMenu}>
        <span className={style.bar}></span>
        <span className={style.bar}></span>
        <span className={style.bar}></span>
      </div>

      {/* Enlaces centrados (solo en desktop) */}
      <div className={style.navbarCenter}>
        {/* Menú Vendedor */}
        {userArea === VENDEDO && (
          <>
            <Link href="/register-requested" className={style.navbarLink}>Registrar Pedido</Link>
            <Link href="/order-list" className={style.navbarLink}>Lista de Pedidos</Link>
            <Link href="/stock" className={style.navbarLink}>Stock</Link>
            <Link href="/client" className={style.navbarLink}>Registro de Cliente</Link>
          </>
        )}

        {/* Menú Jefe de Ventas */}
        {userArea === JEFEVEN && (
          <>
            <Link href="/register-requested" className={style.navbarLink}>Registrar Pedido</Link>
            <Link href="/order-list" className={style.navbarLink}>Lista de Pedidos</Link>
            <Link href="/stock" className={style.navbarLink}>Stock</Link>
            <Link href="/client" className={style.navbarLink}>Registro de Cliente</Link>
            <Link href="/abono" className={style.navbarLink}>Registro de Abono</Link>
            <Link href="/qr" className={style.navbarLink}>Generador de etiquetas</Link>
            <Link href="/inventory" className={style.navbarLink}>Inventario</Link>

            {/* Menú de reportes */}
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
      </div>

      {/* Panel lateral responsive: user + enlaces */}
      <div className={`${style.navbarRight} ${isMenuOpen ? style.open : ''}`}>
        {/* Info del usuario */}
        <div className={style.userInfo}>
          <Image
            src="/img/unnamed.jpg"
            alt="User Avatar"
            width={40}
            height={40}
            className={style.userAvatar}
          />
        </div>
        <div className={style.userDetails}>
          <span className={style.username}>{username}</span>
          <span className={style.userArea}>{userArea}</span>
        </div>

        {/* Enlaces para menú responsive */}
        <div className={style.navbarMobileLinks}>
          {/* Menú Vendedor */}
          {userArea === VENDEDO && (
            <>
              <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>Registrar Pedido</Link>
              <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>Lista de Pedidos</Link>
              <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>Stock</Link>
              <Link href="/client" className={style.navbarLink} onClick={handleLinkClick}>Registro de Cliente</Link>
            </>
          )}

          {/* Menú Jefe de Ventas */}
          {userArea === JEFEVEN && (
            <>
              <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>Registrar Pedido</Link>
              <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>Lista de Pedidos</Link>
              <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>Stock</Link>
              <Link href="/client" className={style.navbarLink} onClick={handleLinkClick}>Registro de Cliente</Link>
              <Link href="/abono" className={style.navbarLink} onClick={handleLinkClick}>Registro de Abono</Link>
              <Link href="/qr" className={style.navbarLink} onClick={handleLinkClick}>Generador de etiquetas</Link>
              <Link href="/inventory" className={style.navbarLink} onClick={handleLinkClick}>Inventario</Link>

              {/* Menú de reportes en mobile */}
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
