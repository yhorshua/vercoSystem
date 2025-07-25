'use client';

import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver'; // Para la exportación de archivos
import * as XLSX from 'xlsx'; // Para exportar a Excel
import styles from './page.module.css'; // Importamos los estilos CSS

// Datos de ejemplo con los campos solicitados
const mockData = [
  {
    codigo: 'A1001AR',
    serie: 'A',
    descripcion: 'ZAPATILLA DEP. ULTRA AZULINO/ ROSADO 38-43',
    sal00: 23,
    sal01: 10,
    sal02: 22,
    sal03: 33,
    sal04: 12,
    sal05: 0,
    sal06: 0,
    saldo: 0
  }
];

const StockPage = () => {
  const [codigoArticulo, setCodigoArticulo] = useState('');
  const [nombreArticulo, setNombreArticulo] = useState('');
  const [stock, setStock] = useState(mockData); // Aquí puedes filtrar según el código y nombre
  const [isBrowser, setIsBrowser] = useState(false); // Para verificar si estamos en el navegador
  const [jsPDF, setJsPDF] = useState<any>(null); // Para almacenar jsPDF cargado dinámicamente

  // Función para filtrar los datos según el código y nombre
  const handleSearch = () => {
    const filteredData = mockData.filter(item => 
      item.codigo.includes(codigoArticulo) && 
      item.descripcion.toLowerCase().includes(nombreArticulo.toLowerCase())
    );
    setStock(filteredData);
  };

  // Cargar jsPDF y jspdf-autotable solo en el cliente
  useEffect(() => {
    setIsBrowser(true); // Asegurarse de que el código se ejecute en el navegador
    const loadJsPDF = async () => {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable'); // Importar también el complemento para tablas
      setJsPDF(jsPDF);
    };
    loadJsPDF();
  }, []);

  // Función para exportar a Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(stock);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    const excelFile = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelFile]), 'stock.xlsx');
  };

  // Función para exportar a PDF
  const exportToPDF = () => {
    if (isBrowser && jsPDF) {
      const doc = new jsPDF();
      doc.text('Stock de Artículos', 20, 20);
      
      // Definir las cabeceras de la tabla
      const headers = [
        'Código', 'Serie', 'Descripción', 'sal00', 'sal01', 'sal02', 'sal03', 'sal04', 'sal05', 'sal06', 'Saldo'
      ];

      // Definir los datos de la tabla
      const data = stock.map(item => [
        item.codigo,
        item.serie,
        item.descripcion,
        item.sal00,
        item.sal01,
        item.sal02,
        item.sal03,
        item.sal04,
        item.sal05,
        item.sal06,
        item.saldo
      ]);

      // Usando autoTable para generar la tabla en el PDF
      doc.autoTable({
        head: [headers],
        body: data,
        startY: 30, // Ajusta la posición vertical de la tabla
      });

      doc.save('stock.pdf');
    }
  };

  return (
    <div className={styles.container}>
      <h1>Consulta de Stock</h1>
      <div className={styles.inputsContainer}>
        <div className={styles.inputGroup}>
          <div>
            <label htmlFor="codigoArticulo">Código de Artículo:</label>
            <input 
              type="text" 
              id="codigoArticulo" 
              value={codigoArticulo} 
              onChange={(e) => setCodigoArticulo(e.target.value)} 
              className={styles.inputField}
            />
          </div>
          <div>
            <label htmlFor="nombreArticulo">Nombre de Artículo:</label>
            <input 
              type="text" 
              id="nombreArticulo" 
              value={nombreArticulo} 
              onChange={(e) => setNombreArticulo(e.target.value)} 
              className={styles.inputField}
            />
          </div>
          {/* Botón de búsqueda */}
          <button className={styles.searchButton} onClick={handleSearch}>Buscar</button>
          <button className={styles.exportButton} onClick={exportToExcel}>Exportar a Excel</button>
        </div>
      </div>

     {/* Contenedor con scroll horizontal para la tabla */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Serie</th>
              <th>Descripción</th>
              <th>sal00</th>
              <th>sal01</th>
              <th>sal02</th>
              <th>sal03</th>
              <th>sal04</th>
              <th>sal05</th>
              <th>sal06</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item, index) => (
              <tr key={index}>
                <td>{item.codigo}</td>
                <td>{item.serie}</td>
                <td>{item.descripcion}</td>
                <td>{item.sal00}</td>
                <td>{item.sal01}</td>
                <td>{item.sal02}</td>
                <td>{item.sal03}</td>
                <td>{item.sal04}</td>
                <td>{item.sal05}</td>
                <td>{item.sal06}</td>
                <td>{item.saldo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockPage;
