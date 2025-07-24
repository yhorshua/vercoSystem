'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { useUser } from '../app/context/UserContext'; // Importamos el hook del contexto

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  // Accedemos al contexto para poder actualizar los datos del usuario
  const { setUser } = useUser(); // Accede a setUser para actualizar los datos en el contexto

  const handleLogin = () => {
    // Validación de las credenciales
    if (username === 'ventas@verco.com.pe' && password === '123456') {
      // Establecer los datos del usuario en el contexto
      setUser(username, 'Ventas'); // Cambia 'Ventas' por el área adecuada

      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Has iniciado sesión correctamente.',
      });

      // Redirigir al usuario a la página de inicio
      router.push('/home');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Credenciales incorrectas',
      });
    }
  };

  return (
    <div className="login-container">
      <div className="logo">
        <Image
          src="/img/verco_logo.png" // Asegúrate de tener el logo en la carpeta public
          alt="VERCO Logo"
          width={200}
          height={200}
        />
      </div>
      <h2 className="title">Iniciar sesión</h2>
      <input
        type="text"
        placeholder="Usuario"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
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
