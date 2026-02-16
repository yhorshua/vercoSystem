'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '../context/UserContext';
import { 
  Menu, 
  X, 
  LogOut, 
  User, 
  ChevronDown, 
  ChevronUp, 
  LayoutDashboard, 
  ClipboardList, 
  Package, 
  Users, 
  BarChart3, 
  Tags, 
  Box, 
  ClipboardPen
} from 'lucide-react';
import style from './page.module.css';

const Navbar = () => {
  const { user, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const router = useRouter();

  if (!user) return null;

  const role = user?.role?.name_role;
  const warehouse_name = user?.warehouse?.warehouse_name;

  const handleLogout = () => {
    logout();
    router.push('/login');
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen((v) => !v);
    // Si cerramos el menú, reseteamos reportes
    if (isMenuOpen) setIsReportOpen(false);
  };

  const toggleReportMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que cierre el menú padre si hubiera
    setIsReportOpen((v) => !v);
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
    setIsReportOpen(false);
  };

  // Renderizado condicional de enlaces según rol
  const RoleLinks = () => (
    <>
      {role === 'Vendedor' && (
        <>
          <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>
            <ClipboardList size={18} /> Registrar Pedido
          </Link>
          <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>
            <LayoutDashboard size={18} /> Lista de Pedidos
          </Link>
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            <Package size={18} /> Stock
          </Link>
          <Link href="/client" className={style.navbarLink} onClick={handleLinkClick}>
            <Users size={18} /> Clientes
          </Link>
        </>
      )}

      {role === 'Administrador' && (
        <>
          <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>
            Registrar Pedido
          </Link>
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            Stock
          </Link>
          <Link href="/qr" className={style.navbarLink} onClick={handleLinkClick}>
            <Tags size={18} /> Etiquetas
          </Link>
          <Link href="/inventory" className={style.navbarLink} onClick={handleLinkClick}>
            <Box size={18} /> Inventario
          </Link>
          <Link href="/production" className={style.navbarLink} onClick={handleLinkClick}>
            Producción
          </Link>
          
          {/* Dropdown de Reportes */}
          <div className={style.reportDropdown}>
            <button onClick={toggleReportMenu} className={`${style.navbarLink} ${style.dropdownTrigger}`} type="button">
              <BarChart3 size={18} /> Reportes {isReportOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {isReportOpen && (
              <div className={style.dropdownMenu}>
                <Link href="/report-client" className={style.navbarLink} onClick={handleLinkClick}>
                  Por Cliente
                </Link>
                <Link href="/report-vendedor" className={style.navbarLink} onClick={handleLinkClick}>
                  Por Vendedor
                </Link>
                <Link href="/report-pedidos" className={style.navbarLink} onClick={handleLinkClick}>
                  Por Pedidos
                </Link>
                <Link href="/report-fechas" className={style.navbarLink} onClick={handleLinkClick}>
                  Por Fecha
                </Link>
              </div>
            )}
          </div>

          <Link href="/warehouses" className={style.navbarLink} onClick={handleLinkClick}>
            Almacenes
          </Link>
          <Link href="/user" className={style.navbarLink} onClick={handleLinkClick}>
            Usuarios
          </Link>
        </>
      )}

      {role === 'Tienda' && (
        <>
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            <Package size={18} /> Stock
          </Link>
          <Link href="/sale" className={style.navbarLink} onClick={handleLinkClick}>
            <LayoutDashboard size={18} /> Venta
          </Link>
          <Link href="/caja" className={style.navbarLink} onClick={handleLinkClick}>
            Caja
          </Link>
          
          <div className={style.reportDropdown}>
             <button onClick={toggleReportMenu} className={`${style.navbarLink} ${style.dropdownTrigger}`} type="button">
              <BarChart3 size={18} /> Reportes {isReportOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {isReportOpen && (
              <div className={style.dropdownMenu}>
                <Link href="/reportsale" className={style.navbarLink} onClick={handleLinkClick}>
                  Reporte de Venta
                </Link>
              </div>
            )}
          </div>

          <Link href="/asistencia" className={style.navbarLink} onClick={handleLinkClick}>
            Asistencia
          </Link>

          <Link href="/register-stock" className={style.navbarLink} onClick={handleLinkClick}>
            <Package size={18} />Registro de stock
          </Link>
          <Link href="/register-product" className={style.navbarLink} onClick={handleLinkClick}>
            <ClipboardPen size={18}/>Registro de productos
          </Link>
        </>
      )}
    </>
  );

  return (
    <>
      <nav className={style.navbar}>
        {/* LOGO */}
        <div className={style.navbarLogo}>
          <Link href="/home">
             <Image src="/img/verco_logo.png" alt="Logo Empresa" width={50} height={30} style={{ objectFit: 'contain' }} />
          </Link>
        </div>

        {/* MENU DESKTOP CENTRAL */}
        <div className={style.navbarCenter}>
          <RoleLinks />
        </div>

        {/* PANEL USUARIO DESKTOP */}
        <div className={style.navbarRight}>
          <div className={style.userInfo}>
            <div className={style.userDetails}>
              <span className={style.username}>{user.full_name}</span>
              <span className={style.userArea}>{warehouse_name}</span>
            </div>
            <div className={style.userAvatar}>
              <User size={20} />
            </div>
          </div>
          <button onClick={handleLogout} className={style.logoutButton}>
            <LogOut size={16} /> Salir
          </button>
        </div>

        {/* BOTON HAMBURGUESA MOVIL */}
        <div className={style.hamburger} onClick={toggleMenu}>
          <Menu size={28} />
        </div>
      </nav>

      {/* OVERLAY MOVIL */}
      {isMenuOpen && (
        <div className={style.mobileOverlay} onClick={toggleMenu} />
      )}

      {/* DRAWER MENU MOVIL */}
      <div className={`${style.mobileDrawer} ${isMenuOpen ? style.open : ''}`}>
        <div className={style.drawerHeader}>
          <span className="text-white font-bold text-lg">Menú</span>
          <button onClick={toggleMenu} className={style.closeBtn}>
            <X size={24} />
          </button>
        </div>

        {/* INFO USUARIO EN MOVIL */}
        <div className={style.mobileUserInfo}>
           <div className={style.userAvatar}>
              <User size={20} />
            </div>
            <div className={style.mobileUserText}>
              <span className={style.username}>{user.full_name}</span>
              <span className={style.userArea}>{warehouse_name}</span>
            </div>
        </div>

        {/* ENLACES MOVIL */}
        <div className={style.mobileLinks}>
          <RoleLinks />
        </div>

        {/* LOGOUT MOVIL */}
        <button onClick={handleLogout} className={`${style.logoutButton} ${style.logoutButtonMobile}`}>
            <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </>
  );
};

export default Navbar;