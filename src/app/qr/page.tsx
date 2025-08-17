// Generador de etiquetas estilo "Evolution"
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
    { codigo: '', descripcion: '', talla: '', color: '', cantidad: 1, imagen: '' },
  ]);

  const handleArticuloChange = (index: number, field: string, value: string | number) => {
    const nuevos = [...articulos];
    nuevos[index] = { ...nuevos[index], [field]: value };
    setArticulos(nuevos);
  };

  const handleImagenChange = (index: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const nuevos = [...articulos];
      nuevos[index].imagen = reader.result as string;
      setArticulos(nuevos);
    };
    reader.readAsDataURL(file);
  };

  const agregarArticulo = () => {
    setArticulos([...articulos, { codigo: '', descripcion: '', talla: '', color: '', cantidad: 1, imagen: '' }]);
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

    articulos.forEach(({ codigo, descripcion, talla, color, cantidad, imagen }, idxArt) => {
      for (let i = 0; i < cantidad; i++) {
        // Marco general
        doc.setLineWidth(0.2);
        doc.rect(2, 2, 96, 46);

        // Línea divisoria vertical
        doc.line(45, 2, 45, 48);

        // ================= IZQUIERDA =================
        // Logo arriba
        const logo = new Image();
        logo.src = '/img/verco2.png';
        doc.addImage(logo, 'PNG', 6, 3, 30, 10);

        // Imagen del modelo
        if (imagen) {
          doc.addImage(imagen, 'PNG', 6, 15, 35, 25);
        }

        // Código debajo de la imagen
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(codigo, 23, 45, { align: 'center' });

        // ================= DERECHA =================
        // Franja negra con la talla
        doc.setFillColor(0, 0, 0);
        doc.rect(46, 3, 20, 12, 'F'); // fondo negro
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(talla, 56, 11, { align: 'center' });

        // Volvemos texto negro normal
        doc.setTextColor(0, 0, 0);

        // Descripción + color al lado de la talla
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${descripcion}`, 68, 8, { maxWidth: 28 });
        doc.text(`Color: ${color}`, 68, 13, { maxWidth: 28 });

        // Línea horizontal para separar zona de código de barras
        doc.line(46, 30, 97, 30);

        // Código de barras
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, `${codigo}${talla}${tarjeta}`, {
          format: 'CODE128',
          displayValue: false,
          height: 20,
        });
        const barcodeImg = canvas.toDataURL();
        doc.addImage(barcodeImg, 'PNG', 47, 32, 48, 10);

        // Texto debajo del código de barras
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${codigo}${talla}${tarjeta}`, 70, 47, { align: 'center' });

        // Página siguiente si aún hay etiquetas
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
              placeholder="Color"
              value={a.color}
              onChange={(e) => handleArticuloChange(i, 'color', e.target.value)}
              className={styles.inputSmall}
            />
            <input
              type="number"
              placeholder="Cantidad"
              value={a.cantidad}
              onChange={(e) => handleArticuloChange(i, 'cantidad', Number(e.target.value))}
              className={styles.inputSmall}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImagenChange(i, e.target.files?.[0] || null)}
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
