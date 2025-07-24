'use client';

import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver'; // Para la exportación de archivos
import * as XLSX from 'xlsx'; // Para exportar a Excel
import styles from './page.module.css'; // Importamos los estilos CSS

// Simulando algunos datos de ejemplo
const mockData = [
  { codigo: '001', serie: 'A123', descripcion: 'Artículo 1', tallas: 'M, L', total: 50 },
  { codigo: '002', serie: 'B456', descripcion: 'Artículo 2', tallas: 'S, M, L', total: 30 },
  { codigo: '003', serie: 'C789', descripcion: 'Artículo 3', tallas: 'L', total: 15 },
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
      const headers = ['Código', 'Serie', 'Descripción', 'Tallas', 'Total'];

      // Definir los datos de la tabla
      const data = stock.map(item => [
        item.codigo,
        item.serie,
        item.descripcion,
        item.tallas,
        item.total
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
          {/* Botón de búsqueda al lado derecho de los inputs */}
          <button className={styles.searchButton} onClick={handleSearch}>Buscar</button>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Código</th>
            <th>Serie</th>
            <th>Descripción</th>
            <th>Tallas</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item, index) => (
            <tr key={index}>
              <td>{item.codigo}</td>
              <td>{item.serie}</td>
              <td>{item.descripcion}</td>
              <td>{item.tallas}</td>
              <td>{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.exportButtons}>
        <button className={styles.button} onClick={exportToExcel}>Exportar a Excel</button>
        <button className={styles.button} onClick={exportToPDF}>Exportar a PDF</button>
      </div>
    </div>
  );
};

export default StockPage;
