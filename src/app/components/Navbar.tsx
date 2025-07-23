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
      {/* Logo en el lado izquierdo */}
      <div className="navbar-logo">
        <Image
          src="/img/verco_logo.png" // Ruta de la imagen del logo
          alt="Logo Empresa"
          width={100} // Ajusta el tamaño del logo según sea necesario
          height={40}
        />
      </div>

      {/* Botón de menú hamburguesa alineado a la izquierda */}
      <div className="hamburger" onClick={toggleMenu}>
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </div>

      {/* Contenedor de enlaces centrados */}
      <div className="navbar-center">
        <Link href="/register-pedido" className="navbar-link">Registrar Pedido</Link>
        <Link href="/lista-pedidos" className="navbar-link">Lista de Pedidos</Link>
        <Link href="/stock" className="navbar-link">Stock</Link>
      </div>

      {/* Contenedor del usuario, se muestra cuando se abre el menú */}
      <div className={`navbar-right ${isMenuOpen ? 'open' : ''}`}>
        <div className="user-info">
          <Image
            src="/img/unnamed.jpg" // Ruta de la imagen del usuario
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
      </div>
    </nav>
  );
};

export default Navbar;
