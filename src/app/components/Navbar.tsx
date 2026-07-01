'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '../context/UserContext';
import { useDashboardSocket } from '../context/DashboardSocketContext';
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
  ClipboardPen,
  type LucideIcon,
} from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useUser();
  const { counters } = useDashboardSocket();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (!user) return null;

  const role = user?.role?.name_role;
  const warehouseName = user?.warehouse?.warehouse_name ?? '';

  const ordersNew = counters?.ordersNew ?? 0;
  const webSalesNew = counters?.webSalesNew ?? 0;

  const handleLogout = () => {
    setIsMenuOpen(false);
    setIsReportOpen(false);
    setOpenMenu(null);
    logout();
    router.replace('/login');
  };

  const toggleMenus = (menu: string) => {
    setIsReportOpen(false);
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const toggleMenu = () => {
    setIsMenuOpen((current) => {
      if (current) {
        setIsReportOpen(false);
        setOpenMenu(null);
      }

      return !current;
    });
  };

  const toggleReportMenu = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpenMenu(null);
    setIsReportOpen((current) => !current);
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
    setIsReportOpen(false);
    setOpenMenu(null);
  };

  const cn = (...classes: Array<string | false | null | undefined>) => {
    return classes.filter(Boolean).join(' ');
  };

  type NavItemProps = {
    href: string;
    children: ReactNode;
    icon?: LucideIcon;
    mobile?: boolean;
    badge?: number;
    badgeColor?: 'red' | 'indigo';
  };

  const NavItem = ({
    href,
    children,
    icon: Icon,
    mobile = false,
    badge = 0,
    badgeColor = 'red',
  }: NavItemProps) => {
    return (
      <Link
        href={href}
        onClick={handleLinkClick}
        className={cn(
          'relative flex items-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium text-slate-100 transition-all duration-200 hover:bg-white/10 hover:text-white',
          mobile
            ? 'w-full justify-start px-4 py-3 text-[15px]'
            : 'px-3 py-2 hover:-translate-y-0.5'
        )}
      >
        {Icon && <Icon size={18} className="shrink-0" />}
        <span className="truncate">{children}</span>

        {badge > 0 && (
          <span
            className={cn(
              'rounded-full px-2 py-[2px] text-[10px] font-black text-white',
              badgeColor === 'indigo' ? 'bg-indigo-600' : 'bg-red-600',
              mobile ? 'ml-auto' : 'absolute -right-3 -top-2'
            )}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  type DropdownProps = {
    id: string;
    label: string;
    icon?: LucideIcon;
    children: ReactNode;
    mobile?: boolean;
    report?: boolean;
  };

  const Dropdown = ({
    id,
    label,
    icon: Icon = ClipboardList,
    children,
    mobile = false,
    report = false,
  }: DropdownProps) => {
    const isOpen = report ? isReportOpen : openMenu === id;

    return (
      <div className={cn('relative', mobile && 'w-full')}>
        <button
          type="button"
          onClick={report ? toggleReportMenu : () => toggleMenus(id)}
          aria-expanded={isOpen}
          className={cn(
            'flex items-center gap-2 rounded-lg text-sm font-medium text-slate-100 transition-all duration-200 hover:bg-white/10 hover:text-white',
            mobile
              ? 'w-full justify-between px-4 py-3 text-[15px]'
              : 'px-3 py-2 hover:-translate-y-0.5'
          )}
        >
          <span className="flex items-center gap-2">
            <Icon size={18} className="shrink-0" />
            {label}
          </span>

          {isOpen ? (
            <ChevronUp size={16} className="shrink-0" />
          ) : (
            <ChevronDown size={16} className="shrink-0" />
          )}
        </button>

        {isOpen && (
          <div
            className={cn(
              'flex flex-col gap-1 rounded-xl border border-white/10 p-2',
              mobile
                ? 'mt-2 w-full bg-white/5 pl-3'
                : 'absolute left-0 top-full z-[1100] mt-2 w-72 bg-black shadow-2xl'
            )}
          >
            {children}
          </div>
        )}
      </div>
    );
  };

  const RoleLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {role === 'Vendedor' && (
        <>
          <Dropdown id="pedidos" label="Pedidos" mobile={mobile}>
            <NavItem href="/register-requested" icon={ClipboardList} mobile={mobile}>
              Registro de Pedido x Mayor
            </NavItem>

            <NavItem href="/order-list" icon={LayoutDashboard} mobile={mobile}>
              Lista Pedidos x Mayor
            </NavItem>

            <NavItem href="/cotizacion" icon={Users} mobile={mobile}>
              Nota de Pedido
            </NavItem>
          </Dropdown>

          <NavItem href="/stock" icon={Package} mobile={mobile}>
            Stock
          </NavItem>

          <NavItem href="/clients" icon={Users} mobile={mobile}>
            Clientes
          </NavItem>
        </>
      )}

      {role === 'Jefe Ventas' && (
        <>
          <Dropdown id="pedidos" label="Pedidos" mobile={mobile}>
            <NavItem href="/register-requested" icon={ClipboardList} mobile={mobile}>
              Registro de Pedido x Mayor
            </NavItem>

            <NavItem href="/cotizacion" icon={Users} mobile={mobile}>
              Nota de Pedido
            </NavItem>

            <NavItem href="/registerweb" icon={ClipboardList} mobile={mobile}>
              Registro de Pedido Web
            </NavItem>
          </Dropdown>

          <Dropdown id="clientes" label="Clientes" icon={Users} mobile={mobile}>
            <NavItem href="/clients" icon={Users} mobile={mobile}>
              Gestión de Clientes
            </NavItem>

            <NavItem href="/estadoCuenta" icon={Users} mobile={mobile}>
              Estado de Cuentas de Clientes
            </NavItem>
          </Dropdown>

          <NavItem href="/stock" icon={Package} mobile={mobile}>
            Stock
          </NavItem>

          <NavItem
            href="/order-list"
            icon={LayoutDashboard}
            mobile={mobile}
            badge={ordersNew}
            badgeColor="red"
          >
            Lista Pedidos x Mayor
          </NavItem>

          <NavItem
            href="/listWeb"
            icon={LayoutDashboard}
            mobile={mobile}
            badge={webSalesNew}
            badgeColor="indigo"
          >
            Lista Pedidos Web
          </NavItem>

          <Dropdown id="reporte" label="Reporte" icon={BarChart3} mobile={mobile}>
            <NavItem href="/reportWebPage" icon={Users} mobile={mobile}>
              Reporte de Ventas Web
            </NavItem>

            <NavItem href="/reportMayorPage" icon={Users} mobile={mobile}>
              Reporte de Ventas por Mayor
            </NavItem>
          </Dropdown>
        </>
      )}

      {role === 'Administrador' && (
        <>
          <Dropdown id="pedidos" label="Pedidos" mobile={mobile}>
            <NavItem href="/register-requested" icon={ClipboardList} mobile={mobile}>
              Registro de Pedido x Mayor
            </NavItem>

            <NavItem href="/order-list" icon={LayoutDashboard} mobile={mobile}>
              Lista Pedidos x Mayor
            </NavItem>

            <NavItem href="/cotizacion" icon={Users} mobile={mobile}>
              Nota de Pedido
            </NavItem>

            <NavItem href="/registerweb" icon={ClipboardList} mobile={mobile}>
              Registro de Pedido Web
            </NavItem>

            <NavItem href="/listWeb" icon={LayoutDashboard} mobile={mobile}>
              Lista Pedidos Web
            </NavItem>
          </Dropdown>

          <NavItem href="/stock" icon={Package} mobile={mobile}>
            Stock
          </NavItem>

          <NavItem href="/qr" icon={Tags} mobile={mobile}>
            Etiquetas
          </NavItem>

          <NavItem href="/production" icon={ClipboardPen} mobile={mobile}>
            Producción
          </NavItem>

          <Dropdown id="productos" label="Productos" icon={Package} mobile={mobile}>
            <NavItem href="/listproducts" icon={Package} mobile={mobile}>
              Productos
            </NavItem>

            <NavItem href="/register-product" icon={ClipboardList} mobile={mobile}>
              Registro de Producto
            </NavItem>

            <NavItem href="/inventorySystem" icon={Box} mobile={mobile}>
              Inventario
            </NavItem>

            <NavItem href="/actualizarStock" icon={Users} mobile={mobile}>
              Actualizar Stock
            </NavItem>

            <NavItem href="/register-stock" icon={Package} mobile={mobile}>
              Registro de stock
            </NavItem>
          </Dropdown>

          <Dropdown
            id="reportes-admin"
            label="Reportes"
            icon={BarChart3}
            mobile={mobile}
            report
          >
            <NavItem href="/report-client" mobile={mobile}>
              Por Cliente
            </NavItem>

            <NavItem href="/report-vendedor" mobile={mobile}>
              Por Vendedor
            </NavItem>

            <NavItem href="/report-pedidos" mobile={mobile}>
              Por Pedidos
            </NavItem>

            <NavItem href="/report-fechas" mobile={mobile}>
              Por Fecha
            </NavItem>
          </Dropdown>

          <NavItem href="/warehouses" icon={Box} mobile={mobile}>
            Almacenes
          </NavItem>

          <NavItem href="/user" icon={Users} mobile={mobile}>
            Usuarios
          </NavItem>
        </>
      )}

      {role === 'Tienda' && (
        <>
          <NavItem href="/stock" icon={Package} mobile={mobile}>
            Stock
          </NavItem>

          <NavItem href="/sale" icon={LayoutDashboard} mobile={mobile}>
            Venta
          </NavItem>

          <NavItem href="/caja" icon={Box} mobile={mobile}>
            Caja
          </NavItem>

          <Dropdown
            id="reportes-tienda"
            label="Reportes"
            icon={BarChart3}
            mobile={mobile}
            report
          >
            <NavItem href="/reportsale" mobile={mobile}>
              Reporte de Venta
            </NavItem>
          </Dropdown>

          <NavItem href="/asistencia" icon={ClipboardList} mobile={mobile}>
            Asistencia
          </NavItem>

          <NavItem href="/register-stock" icon={Package} mobile={mobile}>
            Registro de stock
          </NavItem>

          <NavItem href="/change" icon={ClipboardList} mobile={mobile}>
            Cambio o Devolución
          </NavItem>

          <NavItem href="/cotizacion" icon={Users} mobile={mobile}>
            Nota de Pedido
          </NavItem>
        </>
      )}

      {role === 'Emprendedor' && (
        <>
          <NavItem href="/pedidos" icon={ClipboardList} mobile={mobile}>
            Registrar Pedidos
          </NavItem>

          <NavItem href="/dashboardPedido" icon={LayoutDashboard} mobile={mobile}>
            Dashboard
          </NavItem>

          <NavItem href="/detailPedido" icon={ClipboardList} mobile={mobile}>
            Detalle de pedido
          </NavItem>

          <NavItem href="/listPedidos" icon={LayoutDashboard} mobile={mobile}>
            Lista de Pedidos
          </NavItem>

          <NavItem href="/registerweb" icon={ClipboardList} mobile={mobile}>
            Venta por Redes
          </NavItem>
        </>
      )}

      {role === 'Vendedor Web' && (
        <>
          <Dropdown id="pedidos" label="Pedidos" mobile={mobile}>
            <NavItem href="/register-requested" icon={ClipboardList} mobile={mobile}>
              Registro de Pedido x Mayor
            </NavItem>

            <NavItem href="/order-list" icon={LayoutDashboard} mobile={mobile}>
              Lista Pedidos x Mayor
            </NavItem>

            <NavItem href="/cotizacion" icon={Users} mobile={mobile}>
              Nota de Pedido
            </NavItem>

            <NavItem href="/registerweb" icon={ClipboardList} mobile={mobile}>
              Registro de Pedido Web
            </NavItem>

            <NavItem href="/listWeb" icon={LayoutDashboard} mobile={mobile}>
              Lista Pedidos Web
            </NavItem>
          </Dropdown>

          <NavItem href="/stock" icon={Package} mobile={mobile}>
            Stock
          </NavItem>

          <NavItem href="/clients" icon={Users} mobile={mobile}>
            Clientes
          </NavItem>
        </>
      )}

      {role === 'Delivery' && (
        <NavItem href="/listWeb" icon={LayoutDashboard} mobile={mobile}>
          Lista de Pedidos
        </NavItem>
      )}
    </>
  );

  return (
    <>
      <nav className="sticky top-0 z-[1000] flex h-16 w-full items-center justify-between border-b border-white/10 bg-black px-4 shadow-lg shadow-black/30 backdrop-blur-xl md:px-6">
        {/* Logo */}
        <div className="flex h-full shrink-0 items-center">
          <Link href="/home" className="flex items-center transition-transform duration-200 hover:scale-[1.02]">
            <Image
              src="/img/verco_logo.png"
              alt="Logo Empresa"
              width={50}
              height={30}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* Menú desktop */}
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 px-4 xl:flex">
          <RoleLinks />
        </div>

        {/* Usuario desktop */}
        <div className="hidden shrink-0 items-center gap-5 xl:flex">
          <div className="flex items-center gap-3 text-right">
            <div className="flex max-w-[190px] flex-col">
              <span className="truncate text-sm font-bold text-white">
                {user.full_name}
              </span>
              <span className="truncate text-xs uppercase tracking-wider text-slate-100">
                {warehouseName}
              </span>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
              <User size={20} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300 transition-all duration-200 hover:bg-red-500/25 hover:text-white hover:shadow-lg hover:shadow-red-500/30"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>

        {/* Botón hamburguesa */}
        <button
          type="button"
          onClick={toggleMenu}
          aria-label="Abrir menú"
          aria-expanded={isMenuOpen}
          className="flex items-center justify-center rounded-lg border border-transparent bg-white/5 p-2 text-white transition-colors duration-200 hover:border-white/10 hover:bg-white/10 xl:hidden"
        >
          <Menu size={28} />
        </button>
      </nav>

      {/* Overlay móvil */}
      {isMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={toggleMenu}
          className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm xl:hidden"
        />
      )}

      {/* Drawer móvil */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-[1300] flex h-dvh w-[86vw] max-w-sm flex-col overflow-y-auto bg-black p-5 shadow-2xl shadow-black/70 transition-transform duration-300 ease-out xl:hidden',
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="mb-6 flex items-center justify-between border-b border-white/20 pb-4">
          <span className="text-lg font-bold text-white">Menú</span>

          <button
            type="button"
            onClick={toggleMenu}
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-slate-300 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Usuario móvil */}
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
            <User size={20} />
          </div>

          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold text-white">
              {user.full_name}
            </span>
            <span className="truncate text-xs uppercase tracking-wider text-slate-200">
              {warehouseName}
            </span>
          </div>
        </div>

        {/* Links móvil */}
        <div className="flex flex-1 flex-col gap-2">
          <RoleLinks mobile />
        </div>

        {/* Logout móvil */}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm font-bold text-red-300 transition-colors duration-200 hover:bg-red-500/20 hover:text-white"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </aside>
    </>
  );
};

export default Navbar;