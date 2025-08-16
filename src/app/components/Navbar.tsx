'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Usamos Link para la redirección en Next.js
import { useUser } from '../context/UserContext';
import style from './page.module.css'; // Importamos los estilos de CSS Module

const Navbar = () => {
  const { username, userArea } = useUser(); // Accedemos al contexto para obtener el username y userArea

  console.log('Username:', username, 'UserArea:', userArea); // Verifica que estos valores no sean undefined o vacíos

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Alternar el estado del menú
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
        <Link href="/register-requested" className={style.navbarLink}>Registrar Pedido</Link>
        <Link href="/order-list" className={style.navbarLink}>Lista de Pedidos</Link>
        <Link href="/stock" className={style.navbarLink}>Stock</Link>
        <Link href="/client" className={style.navbarLink}>Registro de Cliente</Link>
        <Link href="/abono" className={style.navbarLink}>Registro de Abono</Link>
        <Link href="/qr" className={style.navbarLink}>Registro de codigo de barra</Link>
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
          <Link href="/register-requested" className={style.navbarLink}>Registrar Pedido</Link>
          <Link href="/order-list" className={style.navbarLink}>Lista de Pedidos</Link>
          <Link href="/stock" className={style.navbarLink}>Stock</Link>
          <Link href="/client" className={style.navbarLink}>Registro de Cliente</Link>
          <Link href="/abono" className={style.navbarLink}>Registro de Abono</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
