'use client';

import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-zinc-400 py-12 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        
        {/* Sección Superior: Grid de Contenido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          
          {/* Columna 1: Branding */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <span className="text-2xl font-black tracking-tighter italic">VERCO</span>
            </div>
            <p className="text-sm leading-relaxed">
              Elevando tu rendimiento y estilo desde cada paso. Las mejores zapatillas y ropa deportiva para atletas de élite y entusiastas del fitness.
            </p>
            <div className="flex gap-4 pt-2">
          
            </div>
          </div>

          {/* Columna 2: Tienda */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider text-sm mb-6">Comprar</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Calzado</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Ropa Deportiva</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Accesorios</Link></li>
              <li><Link href="/" className="hover:text-orange-500 font-medium transition-colors">Ofertas Especiales</Link></li>
            </ul>
          </div>

          {/* Columna 3: Soporte */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider text-sm mb-6">Ayuda</h4>
            <ul className="space-y-4 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Estado del pedido</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Devoluciones</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Contacto</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Preguntas Frecuentes</Link></li>
            </ul>
          </div>

          {/* Columna 4: Newsletter */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-wider text-sm mb-6">Únete al club</h4>
            <p className="text-sm mb-4">Recibe ofertas exclusivas y lanzamientos antes que nadie.</p>
            <form className="flex flex-col gap-2">
              <input 
                type="email" 
                placeholder="Tu email aquí" 
                className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm"
              />
              <button className="bg-white text-black font-bold py-2 rounded-md hover:bg-orange-500 hover:text-white transition-all text-sm uppercase">
                Suscribirse
              </button>
            </form>
          </div>
        </div>

        {/* Divisor */}
        <div className="h-px bg-zinc-800 w-full mb-8" />

        {/* Sección Inferior: Legal y Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs">
          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link>
            <Link href="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </div>
          <p className="text-zinc-500">
            © {currentYear} <span className="text-zinc-300 font-medium">Nieva Tech Solutions</span>. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;