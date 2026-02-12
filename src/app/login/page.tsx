'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { User, useUser } from '../context/UserContext';
import { loginService } from '../services/authServices';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const { setUser } = useUser();

  const handleLogin = async () => {
    if (loading || isPending) return;

    if (!email.trim() || !password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor ingresa correo y contraseña.',
        confirmButtonColor: '#3b82f6',
        background: '#1e293b',
        color: '#fff'
      });
      return;
    }

    setLoading(true);

    try {
      const data = await loginService(email.trim(), password);

      const userData: User = {
        id: data.user.id,
        full_name: data.user.full_name,
        email: data.user.email,
        cellphone: data.user.cellphone || '',
        address_home: data.user.address_home || '',
        id_cedula: data.user.id_cedula || '',
        rol_id: data.user.rol_id,
        role: data.user.role,
        date_register: data.user.date_register,
        state_user: data.user.state_user,
        warehouse_id: data.user.warehouse_id,
        warehouse: data.user.warehouse || null,
        token: data.access_token,
      };

      // Guardado de sesión
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        document.cookie = `access_token=${data.access_token}; path=/; max-age=86400;`;
      }

      setUser(userData);

      startTransition(() => {
        router.replace('/home');
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de acceso',
        text: error.message || 'Credenciales incorrectas.',
        confirmButtonColor: '#ef4444',
        background: '#1e293b',
        color: '#fff'
      });
      setLoading(false);
    }
  };

  const busy = loading || isPending;

  return (
    <div className="min-h-screen w-full flex bg-slate-950 font-sans text-slate-200">
      {/* Branding Side (Only on Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden border-r border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-900 to-slate-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center p-12">
          <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-sm mb-8">
            <Image
              src="/img/verco_logo.png"
              alt="VERCO Logo"
              width={220}
              height={100}
              className="drop-shadow-lg"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Bienvenido al Sistema</h2>
          <p className="text-slate-400 mt-2">Gestión administrativa y control de inventario</p>
        </div>
      </div>

      {/* Login Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="lg:hidden mb-8 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
              <Image
                src="/img/verco_logo.png"
                alt="VERCO"
                width={140}
                height={60}
                style={{ width: 'auto', height: 'auto' }}
              />
            </div>
            <h1 className="text-3xl font-bold text-white">Iniciar Sesión</h1>
          </div>

          <div className="space-y-6 mt-8">
            {/* Input Correo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-2 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  className="block w-full pl-12 pr-4 h-10 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                  placeholder="usuario@verco.com.pe"
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 right-2 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={busy}
                  className="block w-full pl-12 pr-4 h-10 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>

              {/* Botón */}
              <button
                onClick={handleLogin}
                disabled={busy}
                className={`
                w-full flex justify-center items-center h-10 px-4 rounded-xl text-white font-semibold text-sm
                transition-all duration-200 shadow-lg shadow-blue-900/20
                ${busy
                    ? 'bg-slate-700 cursor-not-allowed opacity-80'
                    : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20 hover:-translate-y-0.5'
                  }
              `}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight className="ml-2 h-5 w-5 opacity-80" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
