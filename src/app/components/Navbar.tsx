'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Usamos Link para la redirección en Next.js

const Navbar = ({ username, userArea }: { username: string, userArea: string }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Alternar el estado del menú
  };

  return (
  <nav className="navbar">
    {/* Logo */}
    <div className="navbar-logo">
      <Image
        src="/img/verco_logo.png"
        alt="Logo Empresa"
        width={100}
        height={40}
      />
    </div>

    {/* Hamburguesa */}
    <div className="hamburger" onClick={toggleMenu}>
      <span className="bar"></span>
      <span className="bar"></span>
      <span className="bar"></span>
    </div>

    {/* Enlaces centrados (solo en desktop) */}
    <div className="navbar-center">
      <Link href="/register-pedido" className="navbar-link">Registrar Pedido</Link>
      <Link href="/lista-pedidos" className="navbar-link">Lista de Pedidos</Link>
      <Link href="/stock" className="navbar-link">Stock</Link>
    </div>

    {/* Panel lateral responsive: user + enlaces */}
    <div className={`navbar-right ${isMenuOpen ? 'open' : ''}`}>
      {/* User Info */}
      <div className="user-info">
        <Image
          src="/img/unnamed.jpg"
          alt="User Avatar"
          width={40}
          height={40}
          className="user-avatar"
        />
      </div>
      <div className="user-details">
        <span className="username">{username}</span>
        <span className="user-area">{userArea}</span>
      </div>

      {/* Links para menú responsive */}
      <div className="navbar-mobile-links">
        <Link href="/register-pedido" className="navbar-link">Registrar Pedido</Link>
        <Link href="/lista-pedidos" className="navbar-link">Lista de Pedidos</Link>
        <Link href="/stock" className="navbar-link">Stock</Link>
      </div>
    </div>
  </nav>
);

};

export default Navbar;
