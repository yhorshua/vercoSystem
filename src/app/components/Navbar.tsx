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
import { useDashboardSocket } from '../context/DashboardSocketContext';

const Navbar = () => {
  const { user, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { counters } = useDashboardSocket();

  if (!user) return null;

  const role = user?.role?.name_role;
  const warehouse_name = user?.warehouse?.warehouse_name;

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    router.replace('/login');
  };

  const toggleMenus = (menu: string) => {
    setIsReportOpen(false);
    setOpenMenu(openMenu === menu ? null : menu);
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
    setOpenMenu(null);
  };

  // Renderizado condicional de enlaces según rol
  const RoleLinks = () => (
    <>
      {role === 'Vendedor' && (
        <>

          <div className="relative">
            <button
              onClick={() => toggleMenus('pedidos')}
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-black-100 rounded-md"
            >
              <ClipboardList size={18} />
              Pedidos
              {openMenu === 'pedidos' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {openMenu === 'pedidos' && (
              <div className="absolute left-0 mt-2 w-64 bg-black shadow-lg rounded-lg border z-50">
                <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>
                  <ClipboardList size={18} /> Registro de Pedido x Mayor
                </Link>

                <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>
                  <LayoutDashboard size={18} /> Lista Pedidos x Mayor
                </Link>

                <Link href="/cotizacion" className={style.navbarLink} onClick={handleLinkClick}>
                  <Users size={18} /> Nota de Pedido
                </Link>
              </div>
            )}
          </div>
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            <Package size={18} /> Stock
          </Link>
          <Link href="/clients" className={style.navbarLink} onClick={handleLinkClick}>
            <Users size={18} /> Clientes
          </Link>

        </>
      )}

      {role === 'Jefe Ventas' && (
        <>

          <div className="relative">
            <button
              onClick={() => toggleMenus('pedidos')}
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-black-100 rounded-md"
            >
              <ClipboardList size={18} />
              Pedidos
              {openMenu === 'pedidos' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {openMenu === 'pedidos' && (
              <div className="absolute left-0 mt-2 w-64 bg-black shadow-lg rounded-lg border z-50">
                <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>
                  <ClipboardList size={18} /> Registro de Pedido x Mayor
                </Link>
                <Link href="/cotizacion" className={style.navbarLink} onClick={handleLinkClick}>
                  <Users size={18} /> Nota de Pedido
                </Link>
                <Link href="/registerweb" className={style.navbarLink} onClick={handleLinkClick}>
                  <ClipboardList size={18} /> Registro de Pedido Web
                </Link>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => toggleMenus('clientes')}
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-black-100 rounded-md"
            >
              <ClipboardList size={18} />
              Clientes
              {openMenu === 'clientes' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {openMenu === 'clientes' && (
              <div className="absolute left-0 mt-2 w-64 bg-black shadow-lg rounded-lg border z-50">
                <Link href="/clients" className={style.navbarLink} onClick={handleLinkClick}>
                  <Users size={18} /> Gestión de Clientes
                </Link>
                <Link href="/estadoCuenta" className={style.navbarLink} onClick={handleLinkClick}>
                  <Users size={18} /> Estado de Cuentas de Clientes
                </Link>
              </div>
            )}
          </div>
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            <Package size={18} /> Stock
          </Link>

          <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>
            <LayoutDashboard size={18} /> Lista Pedidos x Mayor
            {counters.ordersNew > 0 && (
              <span className="absolute -top-2 -right-3 bg-red-600 text-white text-[10px] font-black px-2 py-[2px] rounded-full">
                {counters.ordersNew}
              </span>
            )}
          </Link>

          <Link href="/listWeb" className={style.navbarLink} onClick={handleLinkClick}>
            <LayoutDashboard size={18} /> Lista Pedidos Web
            {counters.webSalesNew > 0 && (
              <span className="absolute -top-2 -right-3 bg-indigo-600 text-white text-[10px] font-black px-2 py-[2px] rounded-full">
                {counters.webSalesNew}
              </span>
            )}
          </Link>

           <div className="relative">
            <button
              onClick={() => toggleMenus('reporte')}
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-black-100 rounded-md"
            >
              <ClipboardList size={18} />
              Reporte
              {openMenu === 'reporte' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {openMenu === 'reporte' && (
              <div className="absolute left-0 mt-2 w-64 bg-black shadow-lg rounded-lg border z-50">
                <Link href="/reportWebPage" className={style.navbarLink} onClick={handleLinkClick}>
                  <Users size={18} /> Reporte
                </Link>
              </div>
            )}
          </div>
          {/*
          <Link href="/register-stock" className={style.navbarLink} onClick={handleLinkClick}>
            <Package size={18} />Registro de stock
          </Link>
          */}


        </>
      )}

      {role === 'Administrador' && (
        <>

          <div className="relative">
            <button
              onClick={() => toggleMenus('pedidos')}
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-black-100 rounded-md"
            >
              <ClipboardList size={18} />
              Pedidos
              {openMenu === 'pedidos' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {openMenu === 'pedidos' && (
              <div className="absolute left-0 mt-2 w-64 bg-black shadow-lg rounded-lg border z-50">
                <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>
                  <ClipboardList size={18} /> Registro de Pedido x Mayor
                </Link>

                <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>
                  <LayoutDashboard size={18} /> Lista Pedidos x Mayor
                </Link>

                <Link href="/cotizacion" className={style.navbarLink} onClick={handleLinkClick}>
                  <Users size={18} /> Nota de Pedido
                </Link>
                <Link href="/registerweb" className={style.navbarLink} onClick={handleLinkClick}>
                  <ClipboardList size={18} /> Registro de Pedido Web
                </Link>
                <Link href="/listWeb" className={style.navbarLink} onClick={handleLinkClick}>
                  <LayoutDashboard size={18} /> Lista Pedidos Web
                </Link>
              </div>
            )}
          </div>
          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            Stock
          </Link>
          <Link href="/qr" className={style.navbarLink} onClick={handleLinkClick}>
            <Tags size={18} /> Etiquetas
          </Link>
          <Link href="/production" className={style.navbarLink} onClick={handleLinkClick}>
            Producción
          </Link>

          <div className="relative">
            <button
              onClick={() => toggleMenus('productos')}
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-black-100 rounded-md"
            >
              <ClipboardList size={18} />
              Productos
              {openMenu === 'productos' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {openMenu === 'productos' && (
              <div className="absolute left-0 mt-2 w-64 bg-black shadow-lg rounded-lg border z-50">
                <Link href="/listproducts" className={style.navbarLink} onClick={handleLinkClick}>
                  Productos
                </Link>
                <Link href="/register-product" className={style.navbarLink} onClick={handleLinkClick}>
                  Registro de Producto
                </Link>
                <Link href="/inventorySystem" className={style.navbarLink} onClick={handleLinkClick}>
                  <Box size={18} /> Inventario
                </Link>
                <Link href="/actualizarStock" className={style.navbarLink} onClick={handleLinkClick}>
                  <Users size={18} /> Actualizar Stock
                </Link>
                <Link href="/register-stock" className={style.navbarLink} onClick={handleLinkClick}>
                  <Package size={18} />Registro de stock
                </Link>
              </div>
            )}
          </div>

          {/* Dropdown de Reportes */}
          <div className={style.reportDropdown}>
            <button onClick={toggleReportMenu} className={`${style.navbarLink} ${style.dropdownTrigger}`} type="button">
              <BarChart3 size={18} /> Reportes {isReportOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
              <BarChart3 size={18} /> Reportes {isReportOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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
          <Link href="/change" className={style.navbarLink} onClick={handleLinkClick}>
            Cambio o Devolución
          </Link>
          <Link href="/cotizacion" className={style.navbarLink} onClick={handleLinkClick}>
            <Users size={18} /> Nota de Pedido
          </Link>
        </>
      )}

      {role === 'Emprendedor' && (
        <>
          <Link href="/pedidos" className={style.navbarLink} onClick={handleLinkClick}>
            Registrar Pedidos
          </Link>
          <Link href="/dashboardPedido" className={style.navbarLink} onClick={handleLinkClick}>
            Dashboard
          </Link>
          <Link href="/detailPedido" className={style.navbarLink} onClick={handleLinkClick}>
            Detalle de pedido
          </Link>
          <Link href="/listPedidos" className={style.navbarLink} onClick={handleLinkClick}>
            Lista de Pedidos
          </Link>
          <Link href="/registerweb" className={style.navbarLink} onClick={handleLinkClick}>
            Venta por Redes
          </Link>
        </>
      )}
      {role === 'Vendedor Web' && (
        <>
          <div className="relative">
            <button
              onClick={() => toggleMenus('pedidos')}
              className="flex items-center gap-2 px-3 py-2 text-white hover:bg-black-100 rounded-md"
            >
              <ClipboardList size={18} />
              Pedidos
              {openMenu === 'pedidos' ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </button>

            {openMenu === 'pedidos' && (
              <div className="absolute left-0 mt-2 w-64 bg-black shadow-lg rounded-lg border z-50">
                <Link href="/register-requested" className={style.navbarLink} onClick={handleLinkClick}>
                  <ClipboardList size={18} /> Registro de Pedido x Mayor
                </Link>

                <Link href="/order-list" className={style.navbarLink} onClick={handleLinkClick}>
                  <LayoutDashboard size={18} /> Lista Pedidos x Mayor
                </Link>

                <Link href="/cotizacion" className={style.navbarLink} onClick={handleLinkClick}>
                  <Users size={18} /> Nota de Pedido
                </Link>
                <Link href="/registerweb" className={style.navbarLink} onClick={handleLinkClick}>
                  <ClipboardList size={18} /> Registro de Pedido Web
                </Link>
                <Link href="/listWeb" className={style.navbarLink} onClick={handleLinkClick}>
                  <LayoutDashboard size={18} /> Lista Pedidos Web
                </Link>
              </div>
            )}
          </div>

          <Link href="/stock" className={style.navbarLink} onClick={handleLinkClick}>
            <Package size={18} /> Stock
          </Link>
          <Link href="/clients" className={style.navbarLink} onClick={handleLinkClick}>
            <Users size={18} /> Clientes
          </Link>
        </>
      )}

      {role === 'Delivery' && (
        <>
          <Link href="/listWeb" className={style.navbarLink} onClick={handleLinkClick}>
            Lista de Pedidos
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