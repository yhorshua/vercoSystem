'use client'
import React from 'react';
import { ShieldAlert, ArrowLeft, HelpCircle, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';

interface NoAutorizadoScreenProps {
  onGoBack?: () => void;
  onOpenLogin?: () => void;
}


export default function NoAutorizadoScreen({ onGoBack, onOpenLogin }: NoAutorizadoScreenProps) {


  const router = useRouter();

  const handleGoHome = () => {
    router.push('/home'); // Redirige a la página de inicio
  };
  const handleSupportClick = () => {
    Swal.fire({
      title: 'SOPORTE VERCO',
      text: 'Tu solicitud de credenciales de atleta ha sido registrada con el ID temporal SEC-403. Nuestro equipo Elite responderá a tu dirección de correo en menos de 1 hora.',
      icon: 'info',
      background: '#ffffff',
      color: '#1c1917',
      confirmButtonText: 'ENTENDIDO',
      confirmButtonColor: '#1a3e6a',
      customClass: {
        popup: 'border border-stone-200 rounded-[28px]',
        confirmButton: 'rounded-full uppercase tracking-wider text-xs font-black px-6 py-3.5 text-white font-sans cursor-pointer'
      }
    });
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-radial from-stone-900 via-stone-950 to-black text-white p-6 relative overflow-hidden select-none">

      {/* Abstract Glowing Aura Effect in Center Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-red-600/10 blur-3xl rounded-full pointer-events-none" />

      {/* Cyber Grid Lines Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      <div className="w-full max-w-xl relative">
        {/* Decorative Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[10px] font-mono tracking-widest uppercase font-black">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Acceso Denegado • Error 403
          </div>
        </div>

        {/* Glassmorphic Container Card */}
        <div className="bg-stone-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-[40px] p-8 sm:p-12 shadow-[0_30px_70px_rgba(0,0,0,0.8)] text-center space-y-8 relative overflow-hidden">

          {/* Top Lock Badge Animation */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            {/* Pulsing rings */}
            <div className="absolute inset-0 bg-red-500/5 rounded-full animate-ping pointer-events-none" />
            <div className="absolute -inset-2 bg-stone-900/40 rounded-full border border-zinc-800/50" />

            <div className="relative w-16 h-16 bg-gradient-to-b from-stone-800 to-stone-900 border border-zinc-700/60 rounded-2xl flex items-center justify-center text-red-400 shadow-inner">
              <Lock className="w-7 h-7 stroke-[2]" />
            </div>
          </div>

          {/* Heading with pairing typography */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
              Área Deportiva Cifrada
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm font-sans max-w-md mx-auto leading-relaxed">
              No dispones de las credenciales de administrador necesarias para ingresar a esta sección. Asegúrate de haber iniciado sesión con tu cuenta.
            </p>
          </div>

          {/* Cyber Status Details Display */}
          <div className="bg-zinc-950/80 border border-zinc-900/85 p-4.5 rounded-2xl text-left space-y-2 font-mono text-[10px] sm:text-[11px] text-stone-400 tracking-tight">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">RECURSO SOLICITADO:</span>
              <span className="text-red-400 font-bold">/admin/</span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">MÉTODO DE VALIDACIÓN:</span>
              <span className="text-zinc-300">Verco Token Autenticado</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">ESTADO DE ACCESO:</span>
              <span className="text-red-400 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-red-500" />
                DENEGADO DEFINITIVAMENTE
              </span>
            </div>
          </div>

          {/* Call to Actions - Beautiful, high-end buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">

            <button
              onClick={handleGoHome}
              className="px-6 py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver Al Inicio</span>
            </button>

          </div>

          <div className="pt-2">
            <button
              onClick={handleSupportClick}
              className="text-[10px] font-mono font-bold text-stone-500 hover:text-[#1a3e6a] uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>¿Necesitas Asistencia Deportiva?</span>
            </button>
          </div>

        </div>

        {/* Footer Credit */}
        <p className="text-center text-[9px] text-stone-600 font-mono uppercase tracking-widest mt-8">
          SISTEMA DE PROTECCIÓN DE DATOS APEX SPORT INC © 2026
        </p>
      </div>

    </main>
  );
}
