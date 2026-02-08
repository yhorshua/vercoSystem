'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { User, useUser } from '../context/UserContext';
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

      // Asegúrate de que los datos completos del usuario se guardan
       const userData: User = {
      id: data.user.id, // Asegúrate de que el id está incluido
      full_name: data.user.full_name,
      email: data.user.email,
      cellphone: data.user.cellphone || '', // Asegúrate de que no sea undefined
      address_home: data.user.address_home || '', // Lo mismo para address_home
      id_cedula: data.user.id_cedula || '', // Lo mismo para id_cedula
      rol_id: data.user.rol_id,
      role: data.user.role,  // Incluye el objeto completo de role
      date_register: data.user.date_register,  // Asegúrate de que la fecha está incluida
      state_user: data.user.state_user,  // Asegúrate de que state_user está incluido
      warehouse_id: data.user.warehouse_id,  // Warehouse ID
      warehouse: data.user.warehouse || null, // Asegúrate de que warehouse esté en el objeto
      token: data.access_token,  // El token de acceso
    };

      // ✅ guarda rápido (no es lo que más demora normalmente)
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(userData)); // Guarda todos los datos del usuario completos

      document.cookie = `access_token=${data.access_token}; path=/; max-age=86400;`;

      setUser(userData); // Actualiza el estado de usuario en el contexto

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
