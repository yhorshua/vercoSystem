'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getClientes, Cliente } from '../register-requested/mockData'; // Asegúrate de importar el servicio que creamos
import styles from './registroAbono.module.css';

interface Abono {
  id: string;
  cliente: Cliente;
  saldoPendiente: number;
  montoAbonado: number;
  tipoAbono: string;
  fechaIngreso: string;
}

export default function RegistroAbonoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [monto, setMonto] = useState<number>(0);
  const [tipoAbono, setTipoAbono] = useState<string>('Efectivo');
  const [fechaIngreso, setFechaIngreso] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showClienteModal, setShowClienteModal] = useState(false);

  // Simulamos la obtención de clientes de un servicio
  useEffect(() => {
    const clientesSimulados = getClientes(); // Obtener clientes del servicio
    setClientes(clientesSimulados);
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
      cliente: clienteSeleccionado,
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
          value={clienteSeleccionado?.razonSocial || ''}
          onClick={() => setShowClienteModal(true)}
          readOnly
          placeholder="Seleccione un cliente"
          className={styles.input}
        />

        <div>
          <label>Saldo Pendiente</label>
          <input type="number" value={500} disabled className={styles.input} /> {/* Valor simulado */}
        </div>

        <label>Monto del Abono</label>
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(parseFloat(e.target.value))}
          min="0"
          className={styles.input}
        />

        <label>Tipo de Abono</label>
        <select
          value={tipoAbono}
          onChange={(e) => setTipoAbono(e.target.value)}
          className={styles.select}
        >
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Tarjeta">Tarjeta</option>
        </select>

        <label>Fecha de Ingreso</label>
        <input
          type="date"
          value={fechaIngreso}
          onChange={(e) => setFechaIngreso(e.target.value)}
          className={styles.input}
        />

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
                <td>{abono.cliente.razonSocial}</td>
                <td>{abono.saldoPendiente}</td>
                <td>{abono.montoAbonado}</td>
                <td>{abono.tipoAbono}</td>
                <td>{abono.fechaIngreso}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de selección de cliente */}
      {showClienteModal && (
        <ClienteModal
          clientes={clientes}
          onClose={() => setShowClienteModal(false)}
          onSelect={(cliente) => {
            setClienteSeleccionado(cliente);
            setShowClienteModal(false);
          }}
        />
      )}
    </div>
  );
}

interface ClienteModalProps {
  clientes: Cliente[];
  onClose: () => void;
  onSelect: (cliente: Cliente) => void;
}

function ClienteModal({ clientes, onClose, onSelect }: ClienteModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClientes = clientes.filter((cliente) =>
    cliente.razonSocial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Seleccionar Cliente</h2>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.input}
        />

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Seleccionar</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.map((cliente) => (
              <tr key={cliente.codigo}>
                <td>{cliente.razonSocial}</td>
                <td>
                  <button onClick={() => onSelect(cliente)} className={styles.selectButton}>
                    Seleccionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className={styles.closeButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
