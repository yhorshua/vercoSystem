'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';
import { loginService } from '../services/authServices';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition(); // ✅ ayuda a que la navegación se sienta más fluida

  const router = useRouter();
  const { setUser } = useUser();

  const handleLogin = async () => {
    // ✅ evita doble click
    if (loading) return;

    // ✅ validación rápida front (evita requests innecesarias)
    if (!email.trim() || !password.trim()) {
      Swal.fire({ icon: 'warning', title: 'Faltan datos', text: 'Ingresa correo y contraseña.' });
      return;
    }

    setLoading(true);

    try {
      const data = await loginService(email.trim(), password);

      const userData = {
        email: data.user.email,
        fullName: data.user.full_name,
        role: data.user.role.name_role,
        token: data.access_token,
        userId: data.user.id,
        warehouseId: data.user.warehouse_id,
      };

      // ✅ guarda rápido (no es lo que más demora normalmente)
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      document.cookie = `access_token=${data.access_token}; path=/; max-age=86400;`;

      setUser(userData);

      // ✅ navegación “prioritaria” (se siente más rápida)
      startTransition(() => {
        router.replace('/home'); // ✅ replace evita volver al login con back
      });
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Credenciales incorrectas',
      });
      setLoading(false); // ✅ re-habilita botón solo si falla
    }
  };

  const busy = loading || isPending;

  return (
    <div className="login-container">
      <div className="logo">
        <Image src="/img/verco_logo.png" alt="VERCO Logo" width={200} height={200} />
      </div>

      <h2 className="title">Iniciar sesión</h2>

      <input
        type="text"
        placeholder="Correo electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-field"
        disabled={busy}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-field"
        disabled={busy}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleLogin(); // ✅ Enter para login
        }}
      />

      <button
        onClick={handleLogin}
        className="login-button"
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? 'Ingresando...' : 'Iniciar sesión'}
      </button>
    </div>
  );
}
