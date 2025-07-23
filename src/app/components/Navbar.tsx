'use client';

import { useState } from 'react';
import Image from 'next/image';

const Navbar = ({ username, userArea }: { username: string, userArea: string }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Alterna el estado del menú
  };

  return (
    <nav className="navbar">
      {/* Botón de menú hamburguesa alineado a la izquierda */}
      <div className="hamburger" onClick={toggleMenu}>
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
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
