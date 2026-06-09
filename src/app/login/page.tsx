'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';

import { User, useUser } from '../context/UserContext';
import { loginService } from '../services/authServices';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isPending] = useTransition();

  const router = useRouter();
  const { setUser } = useUser();


  const handleLogin = async () => {
    if (loading || isPending) return;

    if (!email.trim() || !password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Por favor ingresa correo y contraseña.',
        confirmButtonColor: '#4f46e5',
        background: '#0a0a0a',
        color: '#f4f4f5',
        customClass: {
          popup:
            'rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md'
        }
      });

      return;
    }

    setLoading(true);

    try {
      const data = await loginService(
        email.trim(),
        password
      );

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

      if (
        typeof window !== 'undefined' &&
        window.localStorage
      ) {
        localStorage.setItem(
          'access_token',
          data.access_token
        );

        localStorage.setItem(
          'user_data',
          JSON.stringify(userData)
        );

        const secure =
          window.location.protocol === 'https:'
            ? '; Secure'
            : '';

        document.cookie =
          `access_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax${secure}`;

        document.cookie =
          `role=${encodeURIComponent(data.user.role.name_role)}; path=/; max-age=86400; SameSite=Lax${secure}`;
      }

      setUser(userData);

      router.replace('/home');
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de acceso',
        text:
          error.message ||
          'Credenciales incorrectas.',
        confirmButtonColor: '#ef4444',
        background: '#0a0a0a',
        color: '#f4f4f5',
        customClass: {
          popup:
            'rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || isPending;

  return (
    <div className="min-h-screen w-full flex bg-[#0a0a0a] font-sans text-zinc-200 overflow-hidden relative selection:bg-indigo-500/30">

      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-zinc-800/40 bg-[#0a0a0a]">
        <div className="relative z-10 flex items-center space-x-3.5">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="text-white font-black text-xl">
              V
            </span>
          </div>

          <span className="text-white font-extrabold tracking-[0.25em] text-md uppercase">
            Verco
          </span>
        </div>

        <div className="relative z-10 my-auto text-left py-12">
          <h1 className="text-5xl lg:text-6xl font-light text-white leading-[1.1] tracking-tight">
            Avanza
            <br />
            <span className="font-extrabold bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-300 bg-clip-text text-transparent">
              Sin Límites
            </span>
          </h1>

          <p className="mt-6 text-zinc-400 text-sm max-w-sm leading-relaxed">
            Centraliza la gestión de almacenes,
            stock y despachos con información actualizada en tiempo real.
          </p>
        </div>

        <div className="relative z-10">
          <div className="h-[1px] w-12 bg-indigo-500 mb-6" />

        </div>
      </div>

      {/* Formulario */}
      <div className="w-full lg:w-1/2 min-h-screen flex items-center justify-center p-8 bg-[#0c0c0e]">
        <div className="w-full max-w-md space-y-10">

          <div className="text-left space-y-2">
            <h2 className="text-3xl font-semibold text-white tracking-tight">
              Bienvenido
            </h2>

            <p className="text-zinc-500 text-sm">
              Ingresa tus credenciales para acceder al
              sistema
            </p>
          </div>

          <div className="space-y-6">

            {/* Email */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">
                Correo Electrónico
              </label>

              <div className="relative">
                <input
                  type="email"
                  value={email}
                  disabled={busy}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    handleLogin()
                  }
                  placeholder="usuario@verco.com.pe"
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all text-sm"
                />

                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500">
                  <Mail size={16} />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider ml-1">
                Contraseña
              </label>

              <div className="relative">
                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  disabled={busy}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    handleLogin()
                  }
                  placeholder="••••••••"
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-white pl-12 pr-12 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all text-sm"
                />

                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-zinc-500">
                  <Lock size={16} />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500"
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              onClick={handleLogin}
              disabled={busy}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Iniciar Sesión'
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}