'use client';

import { useState } from 'react';
import styles from './clienteModal.module.css';

interface ClienteModalProps {
  clientes: string[];
  onClose: () => void;
  onSelect: (nombre: string) => void;
}

export default function ClienteModal({ clientes, onClose, onSelect }: ClienteModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClientes = clientes.filter((cliente) =>
    cliente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Seleccionar Cliente</h2>
        <input
          type="text"
          placeholder="Buscar cliente..."
          className={styles.input}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Seleccionar</th>
              <th>Nombre del Cliente</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.map((cliente, index) => (
              <tr key={index}>
                <td>
                  <button
                    className={styles.selectButton}
                    onClick={() => onSelect(cliente)}
                  >
                    Seleccionar
                  </button>
                </td>
                <td>{cliente}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className={styles.addButton} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
