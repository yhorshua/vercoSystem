// Generador de etiquetas con logo y datos centrados mejorados
'use client';

import { useState } from 'react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import styles from './EtiquetaGenerator.module.css';

export default function EtiquetaGenerator() {
  const [tarjeta, setTarjeta] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [articulos, setArticulos] = useState([
    { codigo: '', descripcion: '', talla: '', cantidad: 1 },
  ]);

  const handleArticuloChange = (index: number, field: string, value: string | number) => {
    const nuevos = [...articulos];
    nuevos[index] = { ...nuevos[index], [field]: value };
    setArticulos(nuevos);
  };

  const agregarArticulo = () => {
    setArticulos([...articulos, { codigo: '', descripcion: '', talla: '', cantidad: 1 }]);
  };

  const eliminarArticulo = (index: number) => {
    const nuevos = articulos.filter((_, i) => i !== index);
    setArticulos(nuevos);
  };

  const generarPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [100, 50],
    });

    articulos.forEach(({ codigo, descripcion, talla, cantidad }, idxArt) => {
      for (let i = 0; i < cantidad; i++) {
        // 🔹 Logo (movido a la derecha)
        const img = new Image();
        img.src = '/img/verco2.png';
        doc.addImage(img, 'PNG', 10, 5, 18, 12);

        // 🔹 Descripción (movida más a la derecha)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(descripcion, 32, 12, { maxWidth: 55 });

        // 🔹 Código
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(codigo, 32, 22);

        // 🔹 Talla
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`${talla}`, 32, 30);

        // 🔹 Número de producción y fechas (más al centro y abajo)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const posX = 72;
        const baseY = 26;
        doc.text(`${tarjeta}`, posX, baseY);
        doc.text(`${fechaInicio.replaceAll('-', '')}`, posX, baseY + 4);
        doc.text(`${fechaFin.replaceAll('-', '')}`, posX, baseY + 8);

        // 🔹 Código de barras
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, codigo + talla, {
          format: 'CODE128',
          displayValue: false,
          height: 20,
        });
        const barcodeImg = canvas.toDataURL();
        doc.addImage(barcodeImg, 'PNG', 25, 36, 60, 12);

        if (!(idxArt === articulos.length - 1 && i === cantidad - 1)) {
          doc.addPage([100, 50]);
        }
      }
    });

    doc.save(`etiquetas_tarjeta_${tarjeta}.pdf`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>🎫 Generador de Etiquetas</h2>

        <div className={styles.formRow}>
          <input
            className={styles.input}
            placeholder="Tarjeta de Producción"
            value={tarjeta}
            onChange={(e) => setTarjeta(e.target.value)}
          />
          <input
            type="date"
            className={styles.input}
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
          <input
            type="date"
            className={styles.input}
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>

        <h3 className={styles.subtitle}>📦 Artículos</h3>
        {articulos.map((a, i) => (
          <div key={i} className={styles.tallaRow}>
            <input
              placeholder="Código"
              value={a.codigo}
              onChange={(e) => handleArticuloChange(i, 'codigo', e.target.value)}
              className={styles.inputSmall}
            />
            <input
              placeholder="Descripción"
              value={a.descripcion}
              onChange={(e) => handleArticuloChange(i, 'descripcion', e.target.value)}
              className={styles.inputSmall}
            />
            <input
              placeholder="Talla"
              value={a.talla}
              onChange={(e) => handleArticuloChange(i, 'talla', e.target.value)}
              className={styles.inputSmall}
            />
            <input
              type="number"
              placeholder="Cantidad"
              value={a.cantidad}
              onChange={(e) => handleArticuloChange(i, 'cantidad', Number(e.target.value))}
              className={styles.inputSmall}
            />
            <button onClick={() => eliminarArticulo(i)} className={styles.btnDelete}>✕</button>
          </div>
        ))}
        <button onClick={agregarArticulo} className={styles.btnAdd}>➕ Agregar artículo</button>

        <div className={styles.actions}>
          <button onClick={generarPDF} className={styles.btnPrimary}>📄 Generar PDF</button>
        </div>
      </div>
    </div>
  );
}
