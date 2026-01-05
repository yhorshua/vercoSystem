'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from './registroAbono.module.css';
import ClienteModal from '../register-requested/ClienteModal'; // Cambia la importación para que sea el segundo componente

interface Abono {
  id: string;
  saldoPendiente: number;
  montoAbonado: number;
  tipoAbono: string;
  fechaIngreso: string;
}

export default function RegistroAbonoPage() {
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [monto, setMonto] = useState<number>(0);
  const [tipoAbono, setTipoAbono] = useState<string>('Efectivo');
  const [fechaIngreso, setFechaIngreso] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);

  useEffect(() => {
    // Simula la carga de clientes, puedes integrar tu servicio aquí.
  }, []);

  // Función para registrar el abono
  const handleRegistrarAbono = () => {
    if (!clienteSeleccionado || monto <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Debe seleccionar un cliente y un monto válido.',
      });
      return;
    }

    // Simulamos el registro de un abono
    const abono: Abono = {
      id: `ABONO-${Date.now()}`,
      saldoPendiente: 500, // Simulamos un saldo pendiente
      montoAbonado: monto,
      tipoAbono,
      fechaIngreso,
    };

    // Simulamos agregar el abono a la lista de abonos registrados
    setAbonos((prev) => [...prev, abono]);

    Swal.fire({
      icon: 'success',
      title: '¡Abono Registrado!',
      text: 'El abono se ha registrado correctamente.',
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Registro de Abonos</h1>

      <div className={styles.formContainer}>
        <label>Cliente</label>
        <input
          type="text"
          value={clienteSeleccionado || ''}
          onClick={() => setShowClienteModal(true)}
          readOnly
          placeholder="Seleccione un cliente"
          className={styles.inputCliente}
        />

        <div className={styles.inputGroup}>
          <div>
            <label>Saldo Pendiente</label>
            <input type="number" value={500} disabled className={styles.input} />
          </div>

          <div>
            <label>Monto del Abono</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(parseFloat(e.target.value))}
              min="0"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.inputGroup}>
          <div>
            <label>Tipo de Abono</label>
            <select
              value={tipoAbono}
              onChange={(e) => setTipoAbono(e.target.value)}
              className={styles.select}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Deposito</option>
              <option value="Tarjeta">Letra</option>
            </select>
          </div>

          <div>
            <label>Fecha de Ingreso</label>
            <input
              type="date"
              value={fechaIngreso}
              onChange={(e) => setFechaIngreso(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        <button
          onClick={handleRegistrarAbono}
          className={styles.submitButton}
          disabled={!clienteSeleccionado || monto <= 0}
        >
          Registrar Abono
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Saldo Pendiente</th>
              <th>Monto Abonado</th>
              <th>Tipo de Abono</th>
              <th>Fecha de Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {abonos.map((abono) => (
              <tr key={abono.id}>
                <td>{clienteSeleccionado}</td>
                <td>{abono.saldoPendiente}</td>
                <td>{abono.montoAbonado}</td>
                <td>{abono.tipoAbono}</td>
                <td>{abono.fechaIngreso}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 
      {showClienteModal && (
        <ClienteModal
          onClose={() => setShowClienteModal(false)}
          onSelect={(cliente) => {
            setClienteSeleccionado(cliente);
            setShowClienteModal(false);
          }} 
        />
      )}Modal de selección de cliente */}
    </div>
  );
}
