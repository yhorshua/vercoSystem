'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { useUser } from '../context/UserContext';
import { loginService } from '../services/authServices';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { setUser } = useUser();

  const handleLogin = async () => {
    try {
      const data = await loginService(email, password);

      // ✅ Guardar token
      localStorage.setItem('access_token', data.access_token);
      document.cookie = `access_token=${data.access_token}; path=/; max-age=86400;`;

      // ✅ Crear el objeto que tu app necesita
      const userData = {
        email: data.user.email,
        fullName: data.user.full_name,
        role: data.user.role.name_role,
        token: data.access_token,
        userId: data.user.id,                 // ✅
        warehouseId: data.user.warehouse_id,   // ✅
      };

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(userData));
      setUser(userData);

      Swal.fire({
        icon: 'success',
        title: `¡Bienvenido ${data.user.full_name}!`,
        text: 'Has iniciado sesión correctamente.',
      });

      router.push('/home');
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Credenciales incorrectas',
      });
    }
  };

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
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input-field"
      />

      <button onClick={handleLogin} className="login-button">
        Iniciar sesión
      </button>
    </div>
  );
}
