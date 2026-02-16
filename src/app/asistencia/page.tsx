'use client';

import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Navigation, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { ClockWidget } from '../components/clockWidget';
import { useUser } from '../context/UserContext';
import { markAttendance, hasUserEnteredToday } from '../services/attendanceService'; // Asegúrate de importar correctamente

const MarkAttendance = () => {
  const { user } = useUser(); // Accedemos al contexto del usuario

  // Estados
  const [userId] = useState<number>(user?.id || 0);  // Usamos el userId desde el contexto
  const [ubicacion, setUbicacion] = useState('');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [isEntradaMarked, setIsEntradaMarked] = useState<boolean>(false); // Marca si la entrada ya está registrada
  const [loading, setLoading] = useState(false);

  // Función para obtener la ubicación del usuario
  const getLocation = () => {
    setLocationStatus('loading');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUbicacion(`Lat: ${position.coords.latitude.toFixed(4)}, Long: ${position.coords.longitude.toFixed(4)}`);
          setLocationStatus('success');
        },
        (error) => {
          console.error(error);
          setLocationStatus('error');
          Swal.fire({
            icon: 'error',
            title: 'Ubicación requerida',
            text: 'Para marcar asistencia, necesitamos acceso a tu ubicación.',
            confirmButtonColor: '#2563EB',
          });
        }
      );
    } else {
      setLocationStatus('error');
      Swal.fire({
        icon: 'error',
        title: 'No soportado',
        text: 'Tu navegador no soporta geolocalización.',
      });
    }
  };

  useEffect(() => {
    getLocation(); // Llamamos a getLocation al montar el componente
  }, []);

  // Verificar si el usuario ya marcó la entrada al regresar al módulo
  useEffect(() => {
    if (user?.id) {
      // Consumiendo el servicio correctamente
      hasUserEnteredToday(user.id).then((response) => {
        if (response && response.tipo === 'entrada') {
          setIsEntradaMarked(true); // Si el tipo es 'entrada', habilitamos la salida
        } else {
          setIsEntradaMarked(false); // Si no ha marcado entrada, habilitamos el botón de entrada
        }
      }).catch((error) => {
        console.error('Error al verificar la entrada del usuario:', error);
      });
    }
  }, [user?.id]); // Este efecto se ejecutará cuando el userId cambie

  // Función para marcar asistencia
  const handleMarkAttendance = async (type: 'entrada' | 'salida') => {
    if (!ubicacion) {
      getLocation(); // Intentamos obtener la ubicación de nuevo
      return;
    }

    setLoading(true);

    try {
      const successMessage = await markAttendance(userId, type, ubicacion); // Usamos el servicio real
      Swal.fire({
        icon: 'success',
        title: 'Registrado',
        text: successMessage,
        timer: 2000,
        showConfirmButton: false
      });
      if (type === 'entrada') {
        setIsEntradaMarked(true); // Si se marca entrada, habilitamos la salida
      } else {
        setIsEntradaMarked(false); // Si se marca salida, reiniciamos
      }

    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e?.message || 'Error al conectar con el servidor',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex items-center justify-center pb-12 px-4 sm:px-6 md:px-8">
      {/* Main content */}
      <main className="w-full max-w-lg px-6 py-8 space-y-6 bg-white rounded-xl shadow-lg">
        
        {/* Widget de Reloj */}
        <ClockWidget />

        {/* Tarjeta de Estado de Ubicación */}
        <div className={`p-6 rounded-xl border flex flex-col items-center gap-6 transition-colors
          ${locationStatus === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : ''}
          ${locationStatus === 'loading' ? 'bg-blue-50 border-blue-100 text-blue-800' : ''}
          ${locationStatus === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : ''}
        `}>
          <div className={`p-2 rounded-full ${locationStatus === 'success' ? 'bg-emerald-100' :
            locationStatus === 'loading' ? 'bg-blue-100' : 'bg-rose-100'}`}>
            <Navigation size={20} className={locationStatus === 'loading' ? 'animate-pulse' : ''} />
          </div>
          <div className="flex-1 text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">Ubicación Actual</h3>
            <p className="text-sm font-medium truncate">
              {locationStatus === 'loading' && 'Obteniendo coordenadas...'}
              {locationStatus === 'error' && 'Ubicación no disponible'}
              {locationStatus === 'success' && ubicacion}
            </p>
          </div>
          {locationStatus === 'error' && (
            <button onClick={getLocation} className="text-xs underline font-semibold">Reintentar</button>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="grid grid-cols-1 gap-6">
          {/* Botón de Entrada */}
          {!isEntradaMarked && (
          <button
            type="button"
            onClick={() => handleMarkAttendance('entrada')}
            disabled={isEntradaMarked || loading || locationStatus !== 'success'}
            className={`relative overflow-hidden group p-6 rounded-2xl border-2 transition-all duration-300
              flex flex-col items-center justify-center gap-3
              ${isEntradaMarked 
                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60' 
                : 'bg-white border-blue-100 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer'
              }
            `}
          >
            <div className={`p-4 rounded-full transition-transform duration-300 group-hover:scale-110
              ${isEntradaMarked ? 'bg-slate-100' : 'bg-blue-50 text-blue-600'}
            `}>
              <LogIn size={32} />
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">Marcar Entrada</div>
              <div className="text-xs opacity-70 mt-1">
                {isEntradaMarked ? 'Ya registrado hoy' : 'Iniciar jornada laboral'}
              </div>
            </div>
            {/* Indicador visual de estado */}
            {isEntradaMarked && (
               <div className="absolute top-4 right-4 text-emerald-500">
                 <CheckCircle2 size={24} />
               </div>
            )}
          </button>
          )}

          {/* Botón de Salida */}
          <div className={`transition-all duration-500 ${isEntradaMarked ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none filter blur-sm'}`}>
            <button
              type="button"
              onClick={() => handleMarkAttendance('salida')}
              disabled={!isEntradaMarked || loading}
              className={`w-full p-6 rounded-2xl border-2 bg-white border-rose-100 
                hover:border-rose-500 hover:shadow-xl hover:shadow-rose-500/10 
                flex flex-col items-center justify-center gap-3 group transition-all
              `}
            >
              <div className="p-4 rounded-full bg-rose-50 text-rose-600 transition-transform duration-300 group-hover:scale-110">
                <LogOut size={32} />
              </div>
              <div className="text-center text-slate-800">
                <div className="text-lg font-bold">Marcar Salida</div>
                <div className="text-xs text-slate-500 mt-1">Finalizar jornada laboral</div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarkAttendance;
