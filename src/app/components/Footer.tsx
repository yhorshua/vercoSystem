'use client';

import Link from 'next/link';
import { Facebook, Instagram, Twitter, Linkedin, Github, Globe } from 'lucide-react';
import style from './footer.module.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={style.footer}>
      <div className={style.container}>
        
        {/* Parte Superior: Branding y Menú */}
        <div className={style.topSection}>
          <div className={style.brand}>
            <span className={style.logoText}>VERCO</span>
            <p className={style.tagline}>Zapatillas & Ropa Deportiva</p>
          </div>
{/*}
          <nav className={style.navLinks}>
            <Link href="/terms" className={style.link}>
              Términos
            </Link>
            <Link href="/privacy" className={style.link}>
              Privacidad
            </Link>
            <Link href="/support" className={style.link}>
              Soporte
            </Link>
            <Link href="/about" className={style.link}>
              Nosotros
            </Link>
          </nav>
*/}
        </div>

        {/* Divisor Visual */}
        <div className={style.divider} />

        {/* Parte Inferior: Copyright y Redes */}
        <div className={style.bottomSection}>
          <p>© {currentYear} Code IA. Todos los derechos reservados.</p>
          {/*}
          <div className={style.socials}>
            <a href="#" className={style.socialIcon} aria-label="Facebook">
              <Facebook size={18} />
            </a>
            <a href="#" className={style.socialIcon} aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="#" className={style.socialIcon} aria-label="Website">
              <Globe size={18} />
            </a>
          </div>
          */}
        </div>

      </div>
    </footer>
  );
};

export default Footer;
