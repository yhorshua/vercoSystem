import { useState } from 'react';
import {
  getEstadoCuentaCliente,
  registrarAbono,
} from '../services/estadoCuentaService';

export function useEstadoCuenta(token: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const cargarEstadoCuenta = async (clienteId: number) => {
    try {
      setLoading(true);

      const res = await getEstadoCuentaCliente(clienteId, token);

      setData(res);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const crearAbono = async (dto: any) => {
    try {
      setLoading(true);

      const res = await registrarAbono(dto, token);

      return res;
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    cargarEstadoCuenta,
    crearAbono,
  };
}