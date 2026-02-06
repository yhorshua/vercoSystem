// components/Footer.tsx
'use client';

import style from './footer.module.css'; // Estilos del footer

const Footer = () => {
  return (
    <footer className={style.footer}>
      <div className={style.footerContent}>
        <p>© 2025 Code IA. Todos los derechos reservados.</p>
        <div className={style.footerLinks}>
          <a href="/terms" className={style.footerLink}>
            Términos y Condiciones
          </a>
          <a href="/privacy" className={style.footerLink}>
            Política de Privacidad
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
