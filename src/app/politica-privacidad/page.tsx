'use client';
import React from 'react';
import { ShieldCheck, Eye, Lock, Smartphone, UserCheck, MessageSquare, Globe } from 'lucide-react';

const PrivacyPolicy = () => {
  const lastUpdated = "12 de Diciembre de 2025";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Política de Privacidad
          </h1>
          <p className="text-blue-100 text-lg md:text-xl font-light">
            En <span className="font-bold text-white underline decoration-blue-400">VERCO</span>, protegemos tus pasos y tus datos.
          </p>
          <p className="mt-6 text-sm text-blue-200">Última actualización: {lastUpdated}</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation - Oculto en móviles */}
          <aside className="hidden lg:block lg:col-span-1">
            <nav className="sticky top-8 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Secciones</p>
              {[
                { label: "Información General", id: "general" },
                { label: "Datos que Recopilamos", id: "datos" },
                { label: "Uso de Información", id: "uso" },
                { label: "Permisos de la App", id: "permisos" },
                { label: "Tus Derechos (ARCO)", id: "derechos" },
                { label: "Contacto", id: "contacto" }
              ].map((item) => (
                <a 
                  key={item.id}
                  href={`#${item.id}`} 
                  className="block px-4 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Contenido Principal */}
          <div className="lg:col-span-3 space-y-12 bg-white p-6 md:p-10 rounded-3xl shadow-xl shadow-slate-200/60">
            
            {/* 1. Información General */}
            <section id="general" className="scroll-mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Globe size={24}/></div>
                <h2 className="text-2xl font-bold">1. Información General</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                La presente Política de Privacidad establece los términos en que <strong>Industria de Calzados verco y articulos deportivos s.r.L</strong> (en adelante "VERCO"), con RUC <strong>20459141350</strong> y domicilio en el distrito de <strong>San Juan de Lurigancho (SJL), Lima, Perú</strong>, usa y protege la información que es proporcionada por sus usuarios al momento de utilizar su aplicación móvil y sitio web.
              </p>
            </section>

            {/* 2. Recopilación de Datos */}
            <section id="datos" className="scroll-mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Eye size={24}/></div>
                <h2 className="text-2xl font-bold">2. Información que Recopilamos</h2>
              </div>
              <p className="text-slate-600 mb-4">Podemos recopilar la siguiente información personal necesaria para la gestión comercial:</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {["Nombre completo", "Información de contacto (Teléfono)", "Correo electrónico", "Dirección de envío", "Historial de pedidos"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="size-2 bg-green-500 rounded-full"></div> {item}
                  </li>
                ))}
              </ul>
            </section>

            {/* 3. Uso de la Información */}
            <section id="uso" className="scroll-mt-10 border-t border-slate-100 pt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><UserCheck size={24}/></div>
                <h2 className="text-2xl font-bold">3. Uso de la Información</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Utilizamos la información con el fin de proporcionar el mejor servicio posible, particularmente para:
              </p>
              <ul className="list-disc ml-6 mt-4 space-y-2 text-slate-600">
                <li>Procesar pedidos de calzado y artículos deportivos.</li>
                <li>Mantener un registro de usuarios y pedidos para mejorar nuestros productos.</li>
                <li>Enviar correos electrónicos o notificaciones sobre ofertas especiales si usted lo autoriza.</li>
              </ul>
            </section>

            {/* 4. Permisos de la App (Clave para Google/Apple) */}
            <section id="permisos" className="scroll-mt-10 bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-600 text-white rounded-lg"><Smartphone size={24}/></div>
                <h2 className="text-2xl font-bold text-blue-900">4. Permisos de la Aplicación</h2>
              </div>
              <p className="text-blue-800/80 mb-4 font-medium text-sm">Para su correcto funcionamiento en Android e iOS, la aplicación de VERCO puede requerir:</p>
              <div className="space-y-3">
                <div className="bg-white/60 p-3 rounded-lg text-sm">
                  <strong>Cámara:</strong> Para permitir al usuario subir fotos de comprobantes de pago o perfiles.
                </div>
                <div className="bg-white/60 p-3 rounded-lg text-sm">
                  <strong>Notificaciones Push:</strong> Para alertar sobre el estado de su pedido o promociones.
                </div>
                <div className="bg-white/60 p-3 rounded-lg text-sm">
                  <strong>Almacenamiento:</strong> Para guardar catálogos de productos o imágenes temporales.
                </div>
              </div>
            </section>

            {/* 5. Seguridad */}
            <section id="seguridad" className="scroll-mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Lock size={24}/></div>
                <h2 className="text-2xl font-bold">5. Seguridad de los Datos</h2>
              </div>
              <p className="text-slate-600 leading-relaxed">
                VERCO está altamente comprometido para cumplir con el compromiso de mantener su información segura. Usamos sistemas de cifrado modernos para asegurar que no exista ningún acceso no autorizado. No vendemos ni cedemos su información personal a terceros, salvo que sea requerido por un juez con una orden judicial.
              </p>
            </section>

            {/* 6. Derechos ARCO (Perú) */}
            <section id="derechos" className="scroll-mt-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><ShieldCheck size={24}/></div>
                <h2 className="text-2xl font-bold">6. Derechos de Control (ARCO)</h2>
              </div>
              <p className="text-slate-600 leading-relaxed italic">
                De acuerdo a la <strong>Ley No. 29733</strong> (Ley de Protección de Datos Personales en Perú), usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) enviando un mensaje a nuestros canales oficiales.
              </p>
            </section>

            {/* 7. Contacto */}
            <section id="contacto" className="scroll-mt-10 border-t border-slate-100 pt-10">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-blue-600 text-white rounded-full mb-4 shadow-lg shadow-blue-200">
                  <MessageSquare size={32}/>
                </div>
                <h2 className="text-3xl font-bold mb-2">¿Tienes dudas?</h2>
                <p className="text-slate-500 mb-6 italic">Contáctanos directamente:</p>
                <div className="bg-slate-50 p-6 rounded-2xl w-full max-w-md border border-slate-200">
                  <p className="text-lg font-bold text-slate-800">Industria de Calzados VERCO</p>
                  <p className="text-blue-600 font-medium">WhatsApp: +51 908 739 387</p>
                  <p className="text-slate-500 text-sm mt-2">San Juan de Lurigancho, Lima, Perú</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 px-4 text-center">
        <p className="text-sm">© {new Date().getFullYear()} VERCO - Todos los derechos reservados.</p>
        <p className="text-xs mt-2 uppercase tracking-tighter">RUC: 20459141350</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;